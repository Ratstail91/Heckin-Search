function FuzzySearchStrategy (string, crit) {
    if (string === null) {
      return false
    }

    fuzzysearch = require('fuzzysearch')

    return fuzzysearch(crit.toLowerCase(), string.toLowerCase())
  }