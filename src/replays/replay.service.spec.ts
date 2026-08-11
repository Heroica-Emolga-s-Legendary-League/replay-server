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
    const service = new ReplayService({ insert } as unknown as ReplayStore);

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

  it('appends a numeric suffix when the requested ID has none', async () => {
    const insert = jest.fn().mockResolvedValueOnce(false).mockResolvedValueOnce(true);
    const service = new ReplayService({ insert } as unknown as ReplayStore);
    const withoutSuffix = { ...replay, id: 'custom', path_name: 'custom' };

    await expect(service.createReplay(withoutSuffix)).resolves.toMatchObject({
      id: 'custom-1',
      path_name: 'custom-1',
    });
  });
});
