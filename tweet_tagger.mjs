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

function hasSpecies(normalized_text, specimen){
    if (normalized_text.includes(` ${specimen} `)){
        return true;
    }
    const spec_parts = specimen.split(' ')
    if (spec_parts.length>1){
        if (normalized_text.includes(` ${spec_parts.join('')}`)){
            return true;
        }
    }
    if (spec_parts.length === 3){
        if (normalized_text.includes(` ${spec_parts[1]}${spec_parts[2]} `)){
            return true;
        } 
    }
    return false;
}

export function expandDocument(tweet, docno) {
    const text = tweet.text.replace(/[\u2018\u2019]/g, "'").replace(/[\u201C\u201D]/g, '"').replace(/-|#|@|\(|\)|\n|\.|!|:|,/g, ' ').toLowerCase();
    const text_parts = text.split(' ').filter(value => value != '' && value != '\n');
    const normalized_text = ` ${text_parts.join(' ')} `
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
        if (hasSpecies(normalized_text, specimen)) {
            specimen.split(' ').forEach(classifiers.add, classifiers)
            speciesMap[specimen].family.split(' ').forEach(classifiers.add, classifiers)
            speciesMap[specimen].order.split(' ').forEach(classifiers.add, classifiers)
            if (speciesList.indexOf(specimen) % 2 == 0) {
                speciesList[speciesList.indexOf(specimen) + 1].split(' ').forEach(classifiers.add, classifiers)
            }
            else {
                speciesList[speciesList.indexOf(specimen) - 1].split(' ').forEach(classifiers.add, classifiers)
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