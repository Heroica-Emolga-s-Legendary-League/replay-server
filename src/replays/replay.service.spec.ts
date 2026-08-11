import { NewReplayDto } from './dto/new-replay.dto';
import { ReplayService } from './replay.service';
import { ReplayStore } from './replay.store';

const replay: NewReplayDto = {
  id: 'gen9-test-1',
  log: 'test log',
  players: ['Alice', 'Bob'],
  format: 'gen9test',
  path_name: 'gen9-test-1',
};

function mockStore(overrides: Partial<ReplayStore> = {}): ReplayStore {
  return {
    findByFingerprint: jest.fn().mockResolvedValue(null),
    tryInsert: jest.fn().mockResolvedValue('created'),
    ...overrides,
  } as unknown as ReplayStore;
}

describe('ReplayService', () => {
  it('saves new replay content under the requested ID', async () => {
    const store = mockStore();
    const service = new ReplayService(store);

    await expect(service.createReplay(replay)).resolves.toEqual({
      replay,
      created: true,
    });
    expect(store.tryInsert).toHaveBeenCalledWith(replay, expect.stringMatching(/^[a-f0-9]{64}$/));
  });

  it('returns an existing replay when its content fingerprint matches', async () => {
    const existing = { ...replay, id: 'canonical-7', path_name: 'canonical-7' };
    const store = mockStore({
      findByFingerprint: jest.fn().mockResolvedValue(existing),
    });
    const service = new ReplayService(store);

    await expect(service.createReplay(replay)).resolves.toEqual({
      replay: existing,
      created: false,
    });
    expect(store.tryInsert).not.toHaveBeenCalled();
  });

  it('uses a new ID when different replay content occupies the requested ID', async () => {
    const tryInsert = jest
      .fn()
      .mockResolvedValueOnce('id-conflict')
      .mockResolvedValueOnce('created');
    const service = new ReplayService(mockStore({ tryInsert }));

    await expect(service.createReplay(replay)).resolves.toEqual({
      replay: { ...replay, id: 'gen9-test-2', path_name: 'gen9-test-2' },
      created: true,
    });
    expect(tryInsert.mock.calls.map(([value]) => value.id)).toEqual([
      'gen9-test-1',
      'gen9-test-2',
    ]);
  });

  it('resolves concurrent identical uploads to the first inserted replay', async () => {
    const existing = { ...replay, id: 'gen9-test-9', path_name: 'gen9-test-9' };
    const findByFingerprint = jest
      .fn()
      .mockResolvedValueOnce(null)
      .mockResolvedValueOnce(existing);
    const service = new ReplayService(
      mockStore({
        findByFingerprint,
        tryInsert: jest.fn().mockResolvedValue('fingerprint-conflict'),
      }),
    );

    await expect(service.createReplay(replay)).resolves.toEqual({
      replay: existing,
      created: false,
    });
  });

  it('does not consider the same players with a different log a duplicate', async () => {
    const store = mockStore();
    const service = new ReplayService(store);

    await service.createReplay(replay);
    await service.createReplay({ ...replay, log: 'a different battle log' });

    const fingerprints = (store.tryInsert as jest.Mock).mock.calls.map(
      ([, fingerprint]) => fingerprint,
    );
    expect(fingerprints[0]).not.toEqual(fingerprints[1]);
  });
});
