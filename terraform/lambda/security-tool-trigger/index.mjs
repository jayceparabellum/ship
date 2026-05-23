import { CodeBuildClient, StartBuildCommand } from '@aws-sdk/client-codebuild';

const client = new CodeBuildClient({});

export const handler = async (event = {}) => {
  const projectName = process.env.CODEBUILD_PROJECT_NAME;

  if (!projectName) {
    throw new Error('CODEBUILD_PROJECT_NAME is required');
  }

  const requestedBy = event.source || 'manual';
  const scheduleTime = event.time || new Date().toISOString();

  const response = await client.send(new StartBuildCommand({
    projectName,
    environmentVariablesOverride: [
      {
        name: 'SECURITY_TOOL_TRIGGER_SOURCE',
        value: requestedBy,
        type: 'PLAINTEXT',
      },
      {
        name: 'SECURITY_TOOL_TRIGGER_TIME',
        value: scheduleTime,
        type: 'PLAINTEXT',
      },
    ],
  }));

  return {
    statusCode: 202,
    buildId: response.build?.id,
    projectName,
    requestedBy,
    scheduleTime,
  };
};
