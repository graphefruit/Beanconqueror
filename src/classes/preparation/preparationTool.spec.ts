import { PreparationTool } from './preparationTool';

describe('PreparationTool', () => {
  it('sets defaults in constructor', () => {
    const tool = new PreparationTool();
    expect(tool.name).toBe('');
    expect(tool.archived).toBe(false);
  });
});
