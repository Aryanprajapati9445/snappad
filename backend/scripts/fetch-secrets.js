const { SecretsManagerClient, GetSecretValueCommand } = require('@aws-sdk/client-secrets-manager');
const fs = require('fs');
const path = require('path');

/**
 * Fetches secrets from AWS Secrets Manager and writes them to a .env file.
 * This is meant to be run as a prestart script during EC2 deployment.
 * NOTE: Written in pure JS to avoid dependency on ts-node in production.
 */
async function fetchSecrets() {
  // Region defaults to ap-south-1 as per deployment guide
  const region = process.env.AWS_REGION || 'ap-south-1';
  // Secret ID defaults to the correct name 'snappad-backend-secrets'
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
    if (error.name === 'ResourceNotFoundException') {
      console.error(`❌ Secret '${secretName}' not found in region '${region}'.`);
    } else if (error.name === 'CredentialsProviderError') {
      console.error(`❌ AWS credentials missing. Ensure IAM Role is attached to EC2 or AWS CLI is configured.`);
    } else {
      console.error('❌ Failed to fetch secrets from AWS Secrets Manager:', error);
    }
    process.exit(1);
  }
}

fetchSecrets();
