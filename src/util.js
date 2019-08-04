'use strict';
const assert = require('assert');

const assertAttributes = (object, ...attributes) => {
    attributes.forEach((attribute) => {
        assert(object.hasOwnProperty(attribute), `Cannot find attribute [${attribute}]`);
    });
};

const parseArray = str => str.split(',').map(item => item.trim());

module.exports = {assertAttributes, parseArray};
