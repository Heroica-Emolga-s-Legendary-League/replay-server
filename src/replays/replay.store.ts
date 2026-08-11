import {
  Injectable,
  OnApplicationShutdown,
  ServiceUnavailableException,
} from '@nestjs/common';
import { Collection, MongoClient, MongoServerError } from 'mongodb';
import { NewReplayDto } from './dto/new-replay.dto';

type ReplayDocument = NewReplayDto & { _id: string };

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

    this.client = new MongoClient(uri, { retryWrites: true });
    await this.client.connect();

    const database = this.client.db(process.env.MONGODB_DATABASE ?? 'replay-server');
    return database.collection<ReplayDocument>(
      process.env.MONGODB_REPLAYS_COLLECTION ?? 'replays',
    );
  }

  async insert(replay: NewReplayDto): Promise<boolean> {
    try {
      await (await this.collection()).insertOne({ ...replay, _id: replay.id });
      return true;
    } catch (error) {
      if (error instanceof MongoServerError && error.code === 11000) {
        return false;
      }
      throw error;
    }
  }

  async findById(id: string): Promise<NewReplayDto | null> {
    const replay = await (await this.collection()).findOne({ _id: id });
    return replay ? this.withoutMongoId(replay) : null;
  }

  async findAll(): Promise<NewReplayDto[]> {
    const replays = await (await this.collection()).find().sort({ _id: 1 }).toArray();
    return replays.map((replay) => this.withoutMongoId(replay));
  }

  async onApplicationShutdown(): Promise<void> {
    await this.client?.close();
  }

  private withoutMongoId({ _id: _ignored, ...replay }: ReplayDocument): NewReplayDto {
    return replay;
  }
}
