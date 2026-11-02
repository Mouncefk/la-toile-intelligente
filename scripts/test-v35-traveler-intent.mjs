import assert from 'node:assert/strict';
import { classify } from '../server/v30-platform.js';

const family = classify("Nous voulons partir à Marrakech en famille avec deux enfants en avril 2027, pour 8 jours, à un rythme tranquille, avec un budget économique.");
assert.equal(family.territoryKey, "MARRAKECH");
assert.equal(family.travelerProfile, "Famille");
assert.equal(family.activity, null);
assert.equal(family.durationDays, 8);
assert.equal(family.travelWindow.month, 4);
assert.equal(family.travelWindow.year, 2027);
assert.equal(family.pace, "Tranquille");
assert.equal(family.budgetLevel, "Economique");
assert.ok(family.missing.includes("activity"));

const senior = classify("Un séjour culturel et gastronomique à Fès avec mes parents, mobilité réduite, 6 nuits en octobre, sans escaliers.");
assert.equal(senior.territoryKey, "FES");
assert.equal(senior.travelerProfile, "Tourisme senior");
assert.equal(senior.companion, "Parent");
assert.equal(senior.accessibility, true);
assert.equal(senior.durationDays, 6);
assert.equal(senior.activity, "Culture & patrimoine");
assert.ok(senior.activityPreferences.includes("Gastronomie"));

const flexible = classify("Je souhaite la mer à Agadir, 2 personnes, 7 jours, flexible de 3 jours en septembre 2027, confort.");
assert.equal(flexible.territoryKey, "AGADIR");
assert.equal(flexible.partySize, 2);
assert.equal(flexible.durationDays, 7);
assert.equal(flexible.flexibilityDays, 3);
assert.equal(flexible.travelWindow.month, 9);
assert.equal(flexible.budgetLevel, "Confort");

const unknown = classify("Je veux partir loin et découvrir quelque chose de nouveau.");
assert.equal(unknown.territoryKey, null);
assert.ok(unknown.missing.includes("destination"));
assert.ok(unknown.missing.includes("dates"));
assert.equal(unknown.travelerDecides, true);

console.log("V35 traveler intent qualification: PASS");
