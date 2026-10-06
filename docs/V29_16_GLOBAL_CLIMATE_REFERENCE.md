# V29.16 — Global Climate Reference

V29.16 makes climate a first-class graph dimension.

## Source policy

The schema uses Köppen-Geiger labels as representative semantic classes, while keeping the source/provenance fields open. A production geographic assignment must be loaded from a governed climate dataset with explicit version, source and evidence.

This is deliberately not a weather service. Climate describes long-term environmental regimes; current weather remains dynamic data and can create separate vibrations.

## Hierarchy

Climate region
→ climate class
→ local assignment
→ hemisphere
→ month
→ seasonal profile
→ tourism compatibility.

## Hemisphere

Seasonal interpretation is explicitly indexed by hemisphere:
- north
- south
- equatorial

A month must never be interpreted as a universal season.

## Tourism compatibility

Compatibility is modeled as:
- favorable
- possible
- less_adapted
- unknown

This is advisory, not a decision rule. The traveler can keep an experience even when conditions are less adapted.

The intended UX remains:
“Cette expérience est moins adaptée à votre période. Voici d'autres possibilités correspondant mieux aux conditions prévues.”

## Important boundary

The current seed contains representative climate classes to establish the data model. It does **not** claim that every world territory has already been assigned a definitive climate class.

The next step is to import a real, versioned global climate raster/vector dataset, normalize it to territory/destination geometries, and populate evidence/confidence.

External research confirms that Köppen-Geiger is a global climate classification framework and that the Beck et al. work provides a high-resolution global climate classification dataset; the production source should be selected and licensed deliberately before bulk ingestion.
