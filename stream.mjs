import { Client } from 'twitter-api-sdk';
import secrets from './secrets.json' assert { type: 'json' };
import * as fs from 'fs';

const client = new Client(secrets.bearerToken);

async function main() {
    const filestream = fs.createWriteStream("./tweets.txt", { flags: 'a' });
    await client.tweets.addOrDeleteRules({
        add: [{
            value: '(#IndiAves) AND (-is:retweet)'
        }]
    })
    console.log(await client.tweets.getRules());
    const stream = client.tweets.searchStream({
        "tweet.fields": ["author_id", "attachments", "entities"]
    });
    for await (const tweet of stream) {
        if (tweet.data) {
            if (tweet.data.entities && tweet.data.entities.hashtags) {
                for (const hashtag of tweet.data.entities.hashtags) {
                    if (hashtag.tag.toLowerCase() === 'indiaves' &&
                        Object.keys(line.attachments).length > 0 &&
                        !line.text.startsWith('RT @')) {
                        filestream.write(`${line.id}\n`);
                    }
                }
            }
        }
    }
}

main();