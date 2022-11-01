import { Client } from 'twitter-api-sdk';
import * as fs from 'fs';
import secrets from './other_secrets.json' assert { type: 'json' };
import got from 'got';

const LIKE_FACTOR = 0.15
const RETWEET_FACTOR = 1
const QUOTE_FACTOR = 1
const REPLY_FACTOR = 2
const base_url = 'https://twitter.com/twitter/status'
const client = new Client(secrets.bearerToken);
const data = []
const DAY_IN_MS = 24 * 3600 * 1000;
const HEADER = '<html><title>IndiAves</title><body>'
const FOOTER = '</body></head>'

async function enrichData() {
    const inputFile = fs.readFileSync('tweets.txt');
    const jsonFile = fs.readFileSync('tweets.json');
    const jsonData = JSON.parse(jsonFile.toString())
    const idsSet = new Set()
    const processedIdsSet = new Set()
    const lines = inputFile.toString().replace(/^undefined\n/gm, '').trim().split('\n').map((item) => {
        return JSON.parse(item)
    })
    for (const item of jsonData) {
        if (Date.now() - item['created_at'] > 3 * DAY_IN_MS) {
            processedIdsSet.add(item.id)
            data.push(item)
        }
    }
    for (const line of lines) {
        if (line.entities && line.entities.hashtags) {
            for (const hashtag of line.entities.hashtags) {
                if (hashtag.tag.toLowerCase() === 'indiaves' &&
                    Object.keys(line.attachments).length > 0 &&
                    !line.text.startsWith('RT @') &&
                    !processedIdsSet.has(line.id)) {
                    idsSet.add(line.id)
                }
            }
        }
    }
    const ids = Array.from(idsSet)
    const chunkSize = 100;
    for (let i = 0; i < ids.length; i += chunkSize) {
        const chunk_ids = ids.slice(i, i + chunkSize);
        const tweets = await client.tweets.findTweetsById({
            ids: chunk_ids,
            "tweet.fields": ["public_metrics", "created_at"]
        });
        tweets.data.forEach(item => {
            const metrics = item.public_metrics
            item.score = metrics.like_count * LIKE_FACTOR + metrics.quote_count * QUOTE_FACTOR +
                metrics.reply_count * REPLY_FACTOR + metrics.retweet_count * RETWEET_FACTOR
        })
        data.push(...tweets.data);
    }
    fs.writeFileSync('tweets.json', JSON.stringify(data, null, 2))
}

export async function createHTML(search_term, time, items = 10) {
    if (!items || items <= 0 || items > 25) {
        items = 10
    }
    let requests = []
    let result = HEADER;
    if (data.length === 0) {
        await enrichData();
        setInterval(enrichData, DAY_IN_MS / 4)
    }
    const filteredData = data.filter((item) => {
        return Date.now() - new Date(item.created_at).getTime() < time * DAY_IN_MS
    }).filter((item)=>{
        return item.text.toLowerCase().includes(search_term)
    }).sort((item1, item2) => (item1.score - item2.score)).reverse()
    for (const item of filteredData.slice(0, items)) {
        requests.push(got.get(`https://publish.twitter.com/oembed?url=${base_url}/${item.id}`).json())
    }
    requests = await Promise.allSettled(requests)
    for (const response of requests) {
        result = result + response.value.html;
    }
    return result + FOOTER;
}
