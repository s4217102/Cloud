# Mot à Mot – English ⇄ French Dictionary

A small dictionary app. Open `index.html` in your browser to use it. No install needed.

## What it does
- Translates **English → French** and **French → English** (tap the ⇄ button to swap)
- **Pronunciation**: IPA, an easy "say it like this" spelling, and a speaker button to hear the word
- **Simpler word**: turns a harder word into an easy one, in English and in French
- **Simple English meaning** for every word
- **Similar words** (synonyms) in both languages
- **Example sentence** in both languages, which you can also listen to
- You can search without accents (`epuise` finds `épuisé`)

## Add a new word
Open `index.html`, find `const WORDS = [` and copy one block, for example:

```js
{ en: "tiny", fr: "minuscule", type: "adjective",
  enIpa: "/ˈtaɪ.ni/", enSay: "TY-nee", frIpa: "/mi.ny.skyl/", frSay: "mee-nü-SKÜL",
  simpleEn: "very small", simpleFr: "tout petit",
  meaning: "Something that is very, very small.",
  synEn: ["little", "mini", "teeny"], synFr: ["petit", "microscopique", "infime"],
  exEn: "The kitten has tiny paws.", exFr: "Le chaton a de minuscules pattes." },
```
