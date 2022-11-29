import { Client } from 'twitter-api-sdk';
import * as fs from 'fs';
import secrets from './other_secrets.json' assert { type: 'json' };
import got from 'got';
import { expandDocument } from './tweet_tagger.mjs';

const base_url = 'https://twitter.com/twitter/status'
const client = new Client(secrets.bearerToken);
const DAY_IN_MS = 24 * 3600 * 1000;
const HEADER = '<html><title>IndiAves</title><body>'
const FOOTER = '</body></head>'

let data = [];
let dataMap = null;

async function enrichData() {
    const inputFile = fs.readFileSync('tweets.txt');
    const jsonFile = fs.readFileSync('tweets.json');
    const jsonData = JSON.parse(jsonFile.toString());

    let docno = Number.MIN_SAFE_INTEGER;
    Object.values(jsonData).forEach(item => {
        docno = Math.max(docno, item.docno);
    })
    docno += 1;

    const idsSet = new Set()
    const processedIdsSet = new Set()
    const lines = inputFile.toString().replace(/^undefined\n/gm, '').trim().split('\n').map((item) => {
        return JSON.parse(item)
    })
    for (const key in jsonData) {
        if (Date.now() - new Date(jsonData[key]['created_at']) > 3 * DAY_IN_MS) {
            processedIdsSet.add(jsonData[key].id)
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
            const doc = expandDocument(item, docno)
            if (doc) {
                jsonData[item.id] = doc
                docno += 1
            }
        })
    }
    data = Object.values(jsonData)
    dataMap = jsonData;
    fs.writeFile('tweets.json', JSON.stringify(jsonData, null, 2),()=>{})
}

export async function createHTML(v2 = false, search_term, dayFrom, dayTo, items = 10) {
    if (!items || items <= 0 || items > 25) {
        items = 10
    }
    let requests = []
    let result = HEADER;
    if (data.length === 0) {
        await enrichData();
        setInterval(enrichData, DAY_IN_MS / 4)
    }
    let dayFrom_ms = Date.parse(dayFrom)
    let dayTo_ms = Date.parse(dayTo)
    let filteredData = [];
    if (v2) {
        const searched_ids = await got.get(`http://127.0.0.1:5000/search/${search_term}/count/${items}`).json()
        for (const key of searched_ids) {
            if (dayFrom_ms <= new Date(dataMap[key].created_at).getTime() && dayTo_ms >=  new Date(dataMap[key].created_at).getTime())
                filteredData.push(dataMap[key])
        }
    }
    else {
        filteredData = data.filter((item) => {
            return dayFrom_ms <= new Date(item.created_at).getTime() && dayTo_ms >=  new Date(item.created_at).getTime()
        }).filter((item) => {
            return item.text.toLowerCase().includes(search_term)
        })
        filteredData = filteredData.sort((item1, item2) => (item1.score - item2.score)).reverse()
    }
    for (const item of filteredData.slice(0, items)) {
        requests.push(got.get(`https://publish.twitter.com/oembed?url=${base_url}/${item.id}`).json())
    }
    requests = await Promise.allSettled(requests)
    for (const response of requests) {
        result = result + response.value.html;
    }
    return result + FOOTER;
}
