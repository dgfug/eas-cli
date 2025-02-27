import EasCommand from '../../commandUtils/EasCommand';

export default class BranchPublish extends EasCommand {
  static description = 'deprecated, use "eas update"';
  static hidden = true;

  async runAsync(): Promise<void> {
    throw new Error(BranchPublish.description);
  }
}
