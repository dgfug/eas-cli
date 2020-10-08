import chalk from 'chalk';

import log from '../../../log';
import { Action, CredentialsManager } from '../../CredentialsManager';
import { Context } from '../../context';
import { askForUserProvidedAsync } from '../../utils/promptForCredentials';
import { Keystore, keystoreSchema } from '../credentials';
import { generateRandomKeystoreAsync } from '../utils/keystore';

export class UpdateKeystore implements Action {
  constructor(private projectFullName: string) {}

  public async runAsync(manager: CredentialsManager, ctx: Context): Promise<void> {
    if (await ctx.android.fetchKeystoreAsync(this.projectFullName)) {
      this.displayWarning();
    }
    const keystore = await this.provideOrGenerateAsync();

    await ctx.android.updateKeystoreAsync(this.projectFullName, keystore);
    log(chalk.green('Keystore updated successfully.'));
  }

  private async provideOrGenerateAsync(): Promise<Keystore> {
    const providedKeystore = await askForUserProvidedAsync(keystoreSchema);
    if (providedKeystore) {
      return providedKeystore;
    }

    return await generateRandomKeystoreAsync();
  }

  private displayWarning() {
    log.newLine();
    log.warn(
      `Updating your Android build credentials will remove previous version from our servers, this is a ${chalk.bold(
        'PERMANENT and IRREVERSIBLE action.'
      )}`
    );
    log.warn(
      chalk.bold(
        'Android Keystore must be identical to the one previously used to submit your app to the Google Play Store.'
      )
    );
    log.newLine();
  }
}
