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

describe('ReplayService', () => {
  it('saves the requested ID when it is available', async () => {
    const store = { insert: jest.fn().mockResolvedValue(true) } as unknown as ReplayStore;
    const service = new ReplayService(store);

    await expect(service.createReplay(replay)).resolves.toEqual(replay);
    expect(store.insert).toHaveBeenCalledWith(replay);
  });

  it('increments a numeric suffix until it finds an unused ID', async () => {
    const insert = jest
      .fn()
      .mockResolvedValueOnce(false)
      .mockResolvedValueOnce(false)
      .mockResolvedValueOnce(true);
    const findById = jest
      .fn()
      .mockResolvedValueOnce({ ...replay, players: ['Carol', 'Dave'] })
      .mockResolvedValueOnce({ ...replay, id: 'gen9-test-2', players: ['Eve', 'Frank'] });
    const service = new ReplayService({ insert, findById } as unknown as ReplayStore);

    await expect(service.createReplay(replay)).resolves.toMatchObject({
      id: 'gen9-test-3',
      path_name: 'gen9-test-3',
    });
    expect(insert.mock.calls.map(([value]) => value.id)).toEqual([
      'gen9-test-1',
      'gen9-test-2',
      'gen9-test-3',
    ]);
  });

  it('returns the existing ID without inserting another replay when players match', async () => {
    const existing = { ...replay, log: 'original saved log' };
    const insert = jest.fn().mockResolvedValue(false);
    const findById = jest.fn().mockResolvedValue(existing);
    const service = new ReplayService({ insert, findById } as unknown as ReplayStore);

    await expect(
      service.createReplay({ ...replay, log: 'new duplicate upload' }),
    ).resolves.toEqual(existing);
    expect(insert).toHaveBeenCalledTimes(1);
    expect(findById).toHaveBeenCalledWith(replay.id);
  });

  it('treats player order as part of the replay identity', async () => {
    const insert = jest.fn().mockResolvedValueOnce(false).mockResolvedValueOnce(true);
    const findById = jest.fn().mockResolvedValue({
      ...replay,
      players: ['Bob', 'Alice'],
    });
    const service = new ReplayService({ insert, findById } as unknown as ReplayStore);

    await expect(service.createReplay(replay)).resolves.toMatchObject({
      id: 'gen9-test-2',
    });
    expect(insert).toHaveBeenCalledTimes(2);
  });

  it('appends a numeric suffix when the requested ID has none', async () => {
    const insert = jest.fn().mockResolvedValueOnce(false).mockResolvedValueOnce(true);
    const findById = jest.fn().mockResolvedValue({
      ...replay,
      id: 'custom',
      players: ['Carol', 'Dave'],
    });
    const service = new ReplayService({ insert, findById } as unknown as ReplayStore);
    const withoutSuffix = { ...replay, id: 'custom', path_name: 'custom' };

    await expect(service.createReplay(withoutSuffix)).resolves.toMatchObject({
      id: 'custom-1',
      path_name: 'custom-1',
    });
  });
});
