import tags from './tag.json' assert { type: 'json' };
import { speciesInfo } from './species_gen.mjs';
import fs from 'fs';

const stopwordsList = fs.readFileSync('./etc/stopword-list.txt')
const LIKE_FACTOR = 0.15
const RETWEET_FACTOR = 1
const QUOTE_FACTOR = 1
const REPLY_FACTOR = 2

const english_tags = new Set(tags.english)
const latin_tags = new Set(tags.scientific)
const english_family = new Set(tags.family)
const latin_family = new Set(tags.latin_family)

const stopwords = new Set(stopwordsList.toString().split('\r\n'))
const speciesList = speciesInfo.speciesList
const speciesMap = speciesInfo.speciesMap

export function expandDocument(tweet, docno) {
    const text = tweet.text.replace(/-|#|@|\(|\)|\n|\.|!|:|,/g, ' ').toLowerCase();
    const text_parts = text.split(' ').filter(value => value != '' && value != '\n');
    const normalized_text = text_parts.join(' ')
    const classifiers = new Set()
    if (normalized_text.includes('titlituesday')) {
        return null;
    }
    for (const part of text_parts) {
        if (!stopwords.has(part) && (english_tags.has(part)
            || latin_tags.has(part)
            || english_family.has(part)
            || latin_family.has(part))) {
            classifiers.add(part)
        }
    }
    for (const specimen of speciesList) {
        if (specimen === 'ou') {
            continue;
        }
        if (` ${normalized_text} `.includes(` ${specimen} `)
            || ` ${normalized_text} `.includes(` ${specimen.split(' ').join('')}`)) {
            classifiers.add(specimen)
            classifiers.add(speciesMap[specimen].family)
            classifiers.add(speciesMap[specimen].order)
            if (speciesList.indexOf(specimen) % 2 == 0) {
                classifiers.add(speciesList[speciesList.indexOf(specimen) + 1])
            }
            else {
                classifiers.add(speciesList[speciesList.indexOf(specimen) - 1])
            }
        }
    }
    const metrics = tweet.public_metrics
    const score = metrics.like_count * LIKE_FACTOR + metrics.quote_count * QUOTE_FACTOR +
        metrics.reply_count * REPLY_FACTOR + metrics.retweet_count * RETWEET_FACTOR
    return {
        text: tweet.text,
        public_metrics: tweet.public_metrics,
        classifiers: Array.from(classifiers),
        id: tweet.id,
        created_at: tweet.created_at,
        docno,
        score
    };
}