const group = require('./group.json')
const fs = require('fs')

const output = {
    "ratites": new Set(["struthioniformes", "rheiformes", "apterygiformes", "casuariiformes", "tinamiformes"]),
    "landfowls": new Set(["galliformes"]),
    "waterfowls": new Set(["anseriformes"]),
    "waterbirds": new Set(["gaviiformes", "sphenisciformes", "procellariiformes", "ciconiiformes", "suliformes", "pelecaniformes", "opisthocomiformes"]),
    "landbirds": new Set(["accipitriformes", "strigiformes", "coliiformes", "leptosomiformes", "trogoniformes", "bucerotiformes", "coraciiformes", "piciformes", "cariamiformes", "falconiformes", "psittaciformes", "passeriformes"]),
    "perching birds": new Set(["passeriformes"]),
    "parrots": new Set(["psittaciformes"]),
    "raptors": new Set(["accipitriformes", "falconiformes", "cariamiformes", "strigiformes"]),
    "intelligent birds": new Set(["psittaciformes", "corvidae"])
}

for (const key in group) {
    output[key] = new Set([group[key].latin_family])
    if (group[key].species.length === 1) {
        if (output[key.trim()]) {
            output[key.trim()].add(group[key].order)
        }
        else {
            output[key.trim()] = new Set([group[key].order])
        }
    }
    const bird_species = key.split(' ').filter(item => item.length > 0)
    for (const bird of bird_species) {
        if (bird === 'and') {
            continue
        }
        if (output[bird]) {
            output[bird].add(group[key].order)
            output[bird].add(group[key].latin_family)
        }
        else {
            output[bird] = new Set([group[key].order, group[key].latin_family])
        }
    }
}

Object.keys(output).forEach(key => {
    output[key] = Array.from(output[key])
})

fs.writeFileSync('thesaurus.json',JSON.stringify(output,null,2))