import groups from './group.json' assert {type: 'json' };

const order = new Set()
const speciesList = []
const speciesMap = {}

for (const item of Object.values(groups)) {
    for (const spec of item.species) {
        speciesList.push(...spec)
        for (const name of spec) {
            speciesMap[name] = {
                family: item.latin_family,
                order: item.order
            }
            order.add(item.order)
        }
    }
}

export const speciesInfo = {
    order,
    speciesList,
    speciesMap
}

