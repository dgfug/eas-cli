import { Config } from '@oclif/core';
import chalk from 'chalk';

import { getMockAppFragment } from '../../../__tests__/commands/utils';
import {
  EnvironmentVariableEnvironment,
  EnvironmentVariableScope,
} from '../../../graphql/generated';
import { EnvironmentVariableMutation } from '../../../graphql/mutations/EnvironmentVariableMutation';
import { AppQuery } from '../../../graphql/queries/AppQuery';
import { EnvironmentVariablesQuery } from '../../../graphql/queries/EnvironmentVariablesQuery';
import Log from '../../../log';
import { promptAsync, selectAsync, toggleConfirmAsync } from '../../../prompts';
import EnvironmentVariableLink from '../link';

jest.mock('../../../graphql/queries/EnvironmentVariablesQuery');
jest.mock('../../../graphql/mutations/EnvironmentVariableMutation');
jest.mock('../../../prompts');
jest.mock('../../../graphql/queries/AppQuery');
jest.mock('../../../log');

describe(EnvironmentVariableLink, () => {
  const projectId = 'test-project-id';
  const variableId = '1';
  const graphqlClient = {};
  const mockConfig = {} as unknown as Config;
  const mockContext = {
    privateProjectConfig: { projectId },
    loggedIn: { graphqlClient },
  };

  const successMessage = (env: EnvironmentVariableEnvironment): string =>
    `Linked variable ${chalk.bold('TEST_VARIABLE')} to project ${chalk.bold(
      '@testuser/testpp'
    )} in ${env.toLocaleLowerCase()}.`;

  beforeEach(() => {
    jest.resetAllMocks();
    jest.mocked(AppQuery.byIdAsync).mockImplementation(async () => getMockAppFragment());
  });

  it('links a shared variable to the current project in non-interactive mode', async () => {
    const mockVariables = [
      {
        id: variableId,
        name: 'TEST_VARIABLE',
        scope: EnvironmentVariableScope.Shared,
        environments: [EnvironmentVariableEnvironment.Development],
      },
    ];
    (EnvironmentVariablesQuery.sharedAsync as jest.Mock).mockResolvedValue(mockVariables);
    (EnvironmentVariableMutation.linkSharedEnvironmentVariableAsync as jest.Mock).mockResolvedValue(
      mockVariables[0]
    );

    const command = new EnvironmentVariableLink(
      ['--variable-name', 'TEST_VARIABLE', '--non-interactive'],
      mockConfig
    );
    // @ts-expect-error
    jest.spyOn(command, 'getContextAsync').mockReturnValue(mockContext);
    await command.run();

    expect(EnvironmentVariablesQuery.sharedAsync).toHaveBeenCalledWith(graphqlClient, {
      appId: projectId,
      filterNames: ['TEST_VARIABLE'],
    });
    expect(EnvironmentVariableMutation.linkSharedEnvironmentVariableAsync).toHaveBeenCalledWith(
      graphqlClient,
      variableId,
      projectId
    );
    expect(Log.withTick).toHaveBeenCalledWith(
      successMessage(EnvironmentVariableEnvironment.Development)
    );
  });

  it('links a shared variable to the current project to a specified environment', async () => {
    const mockVariables = [
      {
        id: variableId,
        name: 'TEST_VARIABLE',
        scope: EnvironmentVariableScope.Shared,
        environments: [EnvironmentVariableEnvironment.Development],
      },
    ];
    (EnvironmentVariablesQuery.sharedAsync as jest.Mock).mockResolvedValue(mockVariables);
    (EnvironmentVariableMutation.linkSharedEnvironmentVariableAsync as jest.Mock).mockResolvedValue(
      mockVariables[0]
    );

    const command = new EnvironmentVariableLink(
      ['--variable-name', 'TEST_VARIABLE', '--environment', 'production', '--non-interactive'],
      mockConfig
    );
    // @ts-expect-error
    jest.spyOn(command, 'getContextAsync').mockReturnValue(mockContext);
    await command.run();

    expect(EnvironmentVariablesQuery.sharedAsync).toHaveBeenCalledWith(graphqlClient, {
      appId: projectId,
      filterNames: ['TEST_VARIABLE'],
    });
    expect(EnvironmentVariableMutation.linkSharedEnvironmentVariableAsync).toHaveBeenCalledWith(
      graphqlClient,
      variableId,
      projectId,
      EnvironmentVariableEnvironment.Production
    );
    expect(Log.withTick).toHaveBeenCalledWith(
      successMessage(EnvironmentVariableEnvironment.Production)
    );
  });

  it('uses --variable-environment to select the variable with ambigous name', async () => {
    const mockVariables = [
      {
        id: variableId,
        name: 'TEST_VARIABLE',
        scope: EnvironmentVariableScope.Shared,
        environments: [EnvironmentVariableEnvironment.Preview],
      },
      {
        id: 'other-id',
        name: 'TEST_VARIABLE',
        scope: EnvironmentVariableScope.Shared,
        environments: [EnvironmentVariableEnvironment.Development],
      },
    ];
    (EnvironmentVariablesQuery.sharedAsync as jest.Mock).mockImplementation(
      (_client, { environment }) => {
        return mockVariables.filter(v => v.environments.includes(environment));
      }
    );
    (EnvironmentVariableMutation.linkSharedEnvironmentVariableAsync as jest.Mock).mockResolvedValue(
      mockVariables[0]
    );
    (toggleConfirmAsync as jest.Mock).mockResolvedValue(true);

    const command = new EnvironmentVariableLink(
      [
        '--variable-name',
        'TEST_VARIABLE',
        '--variable-environment',
        'development',
        '--environment',
        'production',
      ],
      mockConfig
    );
    // @ts-expect-error
    jest.spyOn(command, 'getContextAsync').mockReturnValue(mockContext);
    await command.runAsync();

    expect(EnvironmentVariableMutation.linkSharedEnvironmentVariableAsync).toHaveBeenCalledWith(
      graphqlClient,
      'other-id',
      projectId,
      EnvironmentVariableEnvironment.Production
    );
    expect(Log.withTick).toHaveBeenCalledWith(
      successMessage(EnvironmentVariableEnvironment.Production)
    );
  });

  it('prompts for variable selection when the name is ambigous', async () => {
    const mockVariables = [
      {
        id: variableId,
        name: 'TEST_VARIABLE',
        scope: EnvironmentVariableScope.Shared,
        environments: [EnvironmentVariableEnvironment.Preview],
      },
      {
        id: 'other-id',
        name: 'TEST_VARIABLE',
        scope: EnvironmentVariableScope.Shared,
        environments: [EnvironmentVariableEnvironment.Development],
      },
    ];
    (EnvironmentVariablesQuery.sharedAsync as jest.Mock).mockResolvedValue(mockVariables);
    (EnvironmentVariableMutation.linkSharedEnvironmentVariableAsync as jest.Mock).mockResolvedValue(
      mockVariables[0]
    );
    (selectAsync as jest.Mock).mockResolvedValue(mockVariables[0]);
    (promptAsync as jest.Mock).mockResolvedValue({ environments: mockVariables[0].environments });
    (toggleConfirmAsync as jest.Mock).mockResolvedValue(true);

    const command = new EnvironmentVariableLink([], mockConfig);
    // @ts-expect-error
    jest.spyOn(command, 'getContextAsync').mockReturnValue(mockContext);
    await command.runAsync();

    expect(selectAsync).toHaveBeenCalled();
    expect(EnvironmentVariableMutation.linkSharedEnvironmentVariableAsync).toHaveBeenCalledWith(
      graphqlClient,
      variableId,
      projectId,
      EnvironmentVariableEnvironment.Preview
    );
    expect(Log.withTick).toHaveBeenCalledWith(
      successMessage(EnvironmentVariableEnvironment.Preview)
    );
  });

  it('throws an error when variable name is not found', async () => {
    const mockVariables: never[] = [];
    (EnvironmentVariablesQuery.sharedAsync as jest.Mock).mockResolvedValue(mockVariables);

    const command = new EnvironmentVariableLink(
      ['--variable-name', 'NON_EXISTENT_VARIABLE'],
      mockConfig
    );

    // @ts-expect-error
    jest.spyOn(command, 'getContextAsync').mockReturnValue(mockContext);
    await expect(command.runAsync()).rejects.toThrow(
      "Shared variable NON_EXISTENT_VARIABLE doesn't exist"
    );
  });

  it('uses environments from prompt to both link and unlink environments', async () => {
    const mockVariables = [
      {
        id: variableId,
        name: 'TEST_VARIABLE',
        scope: EnvironmentVariableScope.Shared,
        environments: [EnvironmentVariableEnvironment.Preview],
        linkedEnvironments: [EnvironmentVariableEnvironment.Preview],
      },
    ];
    (EnvironmentVariablesQuery.sharedAsync as jest.Mock).mockResolvedValue(mockVariables);
    (EnvironmentVariableMutation.linkSharedEnvironmentVariableAsync as jest.Mock).mockResolvedValue(
      mockVariables[0]
    );
    (selectAsync as jest.Mock).mockResolvedValue(mockVariables[0]);
    (promptAsync as jest.Mock).mockResolvedValue({
      environments: [EnvironmentVariableEnvironment.Production],
    });
    (toggleConfirmAsync as jest.Mock).mockResolvedValue(true);

    const command = new EnvironmentVariableLink([], mockConfig);
    // @ts-expect-error
    jest.spyOn(command, 'getContextAsync').mockReturnValue(mockContext);
    await command.runAsync();

    expect(promptAsync).toHaveBeenCalled();
    expect(EnvironmentVariableMutation.linkSharedEnvironmentVariableAsync).toHaveBeenCalledWith(
      graphqlClient,
      variableId,
      projectId,
      EnvironmentVariableEnvironment.Production
    );
    expect(EnvironmentVariableMutation.unlinkSharedEnvironmentVariableAsync).toHaveBeenCalledWith(
      graphqlClient,
      variableId,
      projectId,
      EnvironmentVariableEnvironment.Preview
    );
  });

  it('throws an error when variable name is not found', async () => {
    const mockVariables: never[] = [];
    (EnvironmentVariablesQuery.sharedAsync as jest.Mock).mockResolvedValue(mockVariables);

    const command = new EnvironmentVariableLink(
      ['--variable-name', 'NON_EXISTENT_VARIABLE'],
      mockConfig
    );

    // @ts-expect-error
    jest.spyOn(command, 'getContextAsync').mockReturnValue(mockContext);
    await expect(command.runAsync()).rejects.toThrow(
      "Shared variable NON_EXISTENT_VARIABLE doesn't exist"
    );
  });
});
