import { Client } from 'twitter-api-sdk';
import secrets from './secrets.json' assert { type: 'json' };
import * as fs from 'fs';

const client = new Client(secrets.bearerToken);

async function main() {
    const filestream = fs.createWriteStream("./tweets.txt", { flags: 'a' });
    const stream = client.tweets.searchStream({
        "tweet.fields": ["author_id", "attachments", "entities"]
    });
    for await (const tweet of stream) {
        if (tweet.data) {
            console.log('writing', Date.now())
            filestream.write(`${JSON.stringify(tweet.data)}\n`);
        }
    }
}

main();