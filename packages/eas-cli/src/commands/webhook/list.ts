import { getConfig } from '@expo/config';
import { Flags } from '@oclif/core';
import chalk from 'chalk';

import EasCommand from '../../commandUtils/EasCommand';
import { WebhookType } from '../../graphql/generated';
import { WebhookQuery } from '../../graphql/queries/WebhookQuery';
import Log from '../../log';
import { ora } from '../../ora';
import {
  findProjectRootAsync,
  getProjectFullNameAsync,
  getProjectIdAsync,
} from '../../project/projectUtils';
import { formatWebhook } from '../../webhooks/formatWebhook';

export default class WebhookList extends EasCommand {
  static description = 'list webhooks';

  static flags = {
    event: Flags.enum({
      description: 'Event type that triggers the webhook',
      options: [WebhookType.Build, WebhookType.Submit],
    }),
  };

  async runAsync(): Promise<void> {
    const {
      flags: { event },
    } = await this.parse(WebhookList);

    const projectDir = await findProjectRootAsync();
    const { exp } = getConfig(projectDir, { skipSDKVersionRequirement: true });
    const projectId = await getProjectIdAsync(exp);
    const projectFullName = await getProjectFullNameAsync(exp);

    const spinner = ora(`Fetching the list of webhook on project ${projectFullName}`).start();
    try {
      const webhooks = await WebhookQuery.byAppIdAsync(projectId, event && { event });
      if (webhooks.length === 0) {
        spinner.fail(`There are no webhooks on project ${projectFullName}`);
      } else {
        spinner.succeed(`Found ${webhooks.length} webhooks on project ${projectFullName}`);
        const list = webhooks
          .map(webhook => formatWebhook(webhook))
          .join(`\n\n${chalk.dim('———')}\n\n`);
        Log.log(`\n${list}`);
      }
    } catch (err) {
      spinner.fail(
        `Something went wrong and we couldn't fetch the webhook list for the project ${projectFullName}`
      );
      throw err;
    }
  }
}
