import tagged from './tagged.json' assert {type: 'json'}
import fs from 'fs'

const tags = ['black kite']

const result = []
const processedIds = new Set()
for (const query of tags)
    for (const item of tagged) {
        if (processedIds.has(item.id))
            continue;
        if (item.queries.includes(query)) {
            result.push({
                id: item.id,
                text: item.text,
                created_at: item.created_at,
                score: item.score,
                marked_score: item.score
            })
            processedIds.add(item.id)
        }
        else {
            result.push({
                id: item.id,
                text: item.text,
                created_at: item.created_at,
                score: item.score,
                marked_score: 0
            })
        }
    }

const file = fs.createWriteStream('black kite.csv', { flags: 'a' })
result.sort((a,b)=>b.marked_score-a.marked_score)

file.write('id,text,created_at,score,marked_score,relevance_score\n')

const writtenIds = new Set()
for (const item of result) {
    if (writtenIds.has(item.id) && item.marked_score === 0)
     continue;
    file.write(`${item.id},${item.text.replace(/\n|,/g, '')},${item.created_at},${item.score},${item.marked_score},0\n`)
    writtenIds.add(item.id)
}
