import { SecretsManagerClient, GetSecretValueCommand } from '@aws-sdk/client-secrets-manager';
import fs from 'fs';
import path from 'path';

/**
 * Fetches secrets from AWS Secrets Manager and writes them to a .env file.
 * This is meant to be run as a prestart script during EC2 deployment.
 */
async function fetchSecrets() {
  // Region must match where your secret is created
  const region = process.env.AWS_REGION || 'us-east-1';
  // Secret ID/Name configured in your environment or passed as arg
  const secretName = process.env.AWS_SECRET_ID || 'snappad-backend-secrets';

  console.log(`🔍 Fetching secrets from AWS Secrets Manager (Region: ${region}, Secret: ${secretName})...`);

  const client = new SecretsManagerClient({ region });

  try {
    const response = await client.send(
      new GetSecretValueCommand({
        SecretId: secretName,
        VersionStage: 'AWSCURRENT',
      })
    );

    if (!response.SecretString) {
      throw new Error('Secret is not a string or is empty');
    }

    const secrets = JSON.parse(response.SecretString);
    const envFilePath = path.join(__dirname, '..', '.env');

    let envContent = '';
    for (const [key, value] of Object.entries(secrets)) {
      // Basic formatting to handle secrets containing newlines or equals signs
      envContent += `${key}="${String(value).replace(/"/g, '\\"')}"\n`;
    }

    fs.writeFileSync(envFilePath, envContent.trim() + '\n', 'utf8');
    console.log(`✅ Successfully wrote secrets to ${envFilePath}`);

  } catch (error) {
    console.error('❌ Failed to fetch secrets from AWS Secrets Manager:', error);
    process.exit(1);
  }
}

fetchSecrets();
