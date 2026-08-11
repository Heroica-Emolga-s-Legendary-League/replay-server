import {
  Injectable,
  OnApplicationShutdown,
  ServiceUnavailableException,
} from '@nestjs/common';
import { Collection, MongoClient, MongoServerError } from 'mongodb';
import { NewReplayDto } from './dto/new-replay.dto';
import { replayFingerprint } from './replay-fingerprint';

type ReplayDocument = NewReplayDto & {
  _id: string;
  replayFingerprint?: string;
};

export type InsertResult = 'created' | 'id-conflict' | 'fingerprint-conflict';

export interface FingerprintBackfillResult {
  scanned: number;
  updated: number;
  alreadySet: number;
  duplicateContent: Array<{ canonicalId: string; duplicateId: string }>;
}

@Injectable()
export class ReplayStore implements OnApplicationShutdown {
  private client?: MongoClient;
  private collectionPromise?: Promise<Collection<ReplayDocument>>;

  private async collection(): Promise<Collection<ReplayDocument>> {
    if (!this.collectionPromise) {
      this.collectionPromise = this.connect().catch((error) => {
        this.collectionPromise = undefined;
        throw error;
      });
    }
    return this.collectionPromise;
  }

  private async connect(): Promise<Collection<ReplayDocument>> {
    const uri = process.env.MONGODB_URI;
    if (!uri) {
      throw new ServiceUnavailableException('MONGODB_URI is not configured');
    }

    this.client = new MongoClient(uri, {
      retryWrites: true,
      serverSelectionTimeoutMS: 10_000,
    });
    await this.client.connect();

    const database = this.client.db(process.env.MONGODB_DATABASE ?? 'replay-server');
    const collection = database.collection<ReplayDocument>(
      process.env.MONGODB_REPLAYS_COLLECTION ?? 'replays',
    );
    await collection.createIndex(
      { replayFingerprint: 1 },
      {
        name: 'unique_replay_fingerprint',
        unique: true,
        partialFilterExpression: { replayFingerprint: { $type: 'string' } },
      },
    );
    return collection;
  }

  async tryInsert(
    replay: NewReplayDto,
    fingerprint = replayFingerprint(replay),
  ): Promise<InsertResult> {
    try {
      await (await this.collection()).insertOne({
        ...replay,
        _id: replay.id,
        replayFingerprint: fingerprint,
      });
      return 'created';
    } catch (error) {
      if (error instanceof MongoServerError && error.code === 11000) {
        const keyPattern = error.keyPattern as Record<string, number> | undefined;
        return keyPattern?.replayFingerprint
          ? 'fingerprint-conflict'
          : 'id-conflict';
      }
      throw error;
    }
  }

  async insert(replay: NewReplayDto): Promise<boolean> {
    return (await this.tryInsert(replay)) === 'created';
  }

  async findById(id: string): Promise<NewReplayDto | null> {
    const replay = await (await this.collection()).findOne({ _id: id });
    return replay ? this.withoutMetadata(replay) : null;
  }

  async findByFingerprint(fingerprint: string): Promise<NewReplayDto | null> {
    const replay = await (await this.collection()).findOne({
      replayFingerprint: fingerprint,
    });
    return replay ? this.withoutMetadata(replay) : null;
  }

  async findAll(): Promise<NewReplayDto[]> {
    const replays = await (await this.collection()).find().sort({ _id: 1 }).toArray();
    return replays.map((replay) => this.withoutMetadata(replay));
  }

  async backfillFingerprints(): Promise<FingerprintBackfillResult> {
    const collection = await this.collection();
    const documents = await collection.find().sort({ _id: 1 }).toArray();
    const result: FingerprintBackfillResult = {
      scanned: documents.length,
      updated: 0,
      alreadySet: 0,
      duplicateContent: [],
    };
    const claimed = new Map<string, string>();

    for (const document of documents) {
      if (document.replayFingerprint) {
        claimed.set(document.replayFingerprint, document._id);
        result.alreadySet++;
      }
    }

    for (const document of documents) {
      if (document.replayFingerprint) continue;
      const fingerprint = replayFingerprint(this.withoutMetadata(document));
      const canonicalId = claimed.get(fingerprint);
      if (canonicalId) {
        result.duplicateContent.push({ canonicalId, duplicateId: document._id });
        continue;
      }

      await collection.updateOne(
        { _id: document._id, replayFingerprint: { $exists: false } },
        { $set: { replayFingerprint: fingerprint } },
      );
      claimed.set(fingerprint, document._id);
      result.updated++;
    }

    return result;
  }

  async onApplicationShutdown(): Promise<void> {
    await this.client?.close();
  }

  private withoutMetadata({
    _id: _ignoredId,
    replayFingerprint: _ignoredFingerprint,
    ...replay
  }: ReplayDocument): NewReplayDto {
    return replay;
  }
}
