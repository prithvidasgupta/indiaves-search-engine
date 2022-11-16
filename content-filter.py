import pandas as pd
import json
from unidecode import unidecode

df = pd.read_csv('eBird.csv')
df = df[df.category == 'species']
df = df[['English name', 'scientific name', 'order', 'family']]
english_bow = set()
latin_bow = set()
order = set()
latin_family = set()
family = set()

family_map = {}

def add_to_group (eng_family, latin_family, eng_name, latin_name, order_name):
    insert = (eng_name.replace('-', ' ').lower(), latin_name.replace('-',' ').lower())
    if(eng_family in family_map):
        family_map[eng_family]['species'].append(insert)
    else:
        family_map[eng_family] = {
            'latin_family': latin_family,
            'order': order_name,
            'species': [insert]
        }

for index, row in df.iterrows():
    eng_name = row['English name'].replace('-', ' ').lower().split()
    latin_name = row['scientific name'].replace('-', ' ').lower().split()
    order_name = row['order'].lower()
    family_name = row['family'].split('(')
    latin_family_name = family_name[0].replace(' ','').lower()
    eng_family_name = family_name[1].replace(',','').replace(')','').lower().replace('and allies','')
    add_to_group(eng_family_name, latin_family_name, row['English name'], row['scientific name'],order_name)
    
    english_bow.update(eng_name)
    for word in eng_name:
        if "'s" in word:
            decoded_word = unidecode(word)
            english_bow.add(word.replace("'s", ''))
            english_bow.add(word.replace("'", ''))
            english_bow.add(decoded_word)
            english_bow.add(decoded_word.replace("'s", ''))
            english_bow.add(decoded_word.replace("'", ''))
    latin_bow.update(latin_name)
    latin_family.add(latin_family_name)
    family.add(eng_family_name)
    

dict = {
    'english': list(english_bow),
    'scientific': list(latin_bow),
    'family': list(family),
    'latin_family': list(latin_family)
}

with open('tag.json', 'w') as out:
    json.dump(dict, out)

with open('group.json', 'w') as groupOut:
    json.dump(family_map, groupOut)