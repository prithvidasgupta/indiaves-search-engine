import tweets from './tweets.json' assert { type: 'json' };
import { expandDocument } from './tweet_tagger.mjs';
import fs from 'fs'

let docno=1;

const newTweets = {}

for (const key of Object.keys(tweets)){
    const doc = expandDocument(tweets[key], docno)
    if (doc){
        newTweets[key]=doc
        docno+=1
    }
}

fs.writeFile('tweets.json', JSON.stringify(newTweets,null,2),()=>{})