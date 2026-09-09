Oleachron Agronomic Task Intelligence Specification
===================================================

Document Purpose
----------------

This document describes how Oleachron should connect field tasks with weather, soil, satellite, crop-stage, pesticide, and official-warning data.
It is intended for review by an agronomist or agricultural expert.
The expert should validate:
*   Which environmental conditions should be checked for each task.
    
*   Which thresholds are agronomically appropriate.
    
*   Which warnings should be recommendations and which should be restrictions.
    
*   Which rules depend on the selected product, crop stage, soil, variety, or farming method.
    
*   Which conditions require field inspection instead of an automatic conclusion.
    
*   Which rules can be used as general defaults when product-specific information is unavailable.
    
The thresholds in this document are provisional Oleachron defaults. They must not override:
1.  The official product label.
    
2.  Current plant-protection legislation.
    
3.  Official agricultural warnings.
    
4.  Agronomist instructions.
    
5.  Measured field conditions.
    

* * *

1. General Task Evaluation Model
================================

Every field task should be evaluated during three stages.

1.1 Before the Task
-------------------

Oleachron should answer:
*   Are the current conditions suitable?
    
*   Are the forecast conditions suitable?
    
*   What is the best available execution window?
    
*   Should the task be delayed?
    
*   Does the task conflict with a previous treatment?
    
*   Does the task conflict with harvest or re-entry restrictions?
    
*   Does the crop stage allow the task?
    
*   Does an official agricultural warning make the task more urgent?
    
*   Is available field data sufficiently reliable?
    

1.2 During the Task Window
--------------------------

Oleachron should monitor:
*   Whether the forecast changes.
    
*   Whether wind or gusts exceed safe limits.
    
*   Whether rain begins earlier than expected.
    
*   Whether temperature rises above the permitted threshold.
    
*   Whether a thunderstorm or other dangerous event approaches.
    
*   Whether the user should pause, stop, or postpone the task.
    

1.3 After Task Completion
-------------------------

Oleachron should determine:
*   Whether rain, wind, frost, heat, or irrigation may have affected the task.
    
*   Whether the task result may have been reduced.
    
*   Whether another task is temporarily restricted.
    
*   Whether a follow-up field inspection is required.
    
*   Whether the task explains a later satellite-data change.
    
*   Whether the task changes the estimated water, nutrient, or vegetation condition of the field.
    

* * *

2. Required Oleachron Concepts
==============================

2.1 Task Condition Policy
-------------------------

Defines the conditions and thresholds applicable to a task.
Examples:
*   Maximum wind speed.
    
*   Maximum wind gust.
    
*   Minimum and maximum temperature.
    
*   Rain-free period.
    
*   Maximum rainfall after application.
    
*   Minimum interval between applications.
    
*   Pre-harvest interval.
    
*   Re-entry interval.
    
*   Soil-moisture limits.
    
*   Crop-stage restrictions.
    
Policies may originate from:
*   Official product label.
    
*   Agronomist configuration.
    
*   Official agricultural bulletin.
    
*   Oleachron general default.
    
*   Farm-specific rule.
    

2.2 Task Condition Evaluation
-----------------------------

Stores the result of evaluating a task against current and forecast conditions.
Possible outputs:
*   Suitable.
    
*   Suitable with caution.
    
*   Reschedule recommended.
    
*   Not recommended.
    
*   Hard conflict.
    
*   Data uncertain.
    

2.3 Post-Task Monitor
---------------------

Monitors environmental conditions after the task is completed.
Examples:
*   Rain after spraying.
    
*   Heavy rain after fertilisation.
    
*   Frost after pruning.
    
*   Irrigation during a pesticide rainfast period.
    
*   Strong wind after placing traps or protective materials.
    
*   Satellite vegetation decline after irrigation or fertilisation.
    

* * *

3. Data Available to Oleachron
==============================

3.1 Weather Data
----------------

Oleachron may collect or calculate:
*   Air temperature.
    
*   Apparent temperature.
    
*   Relative humidity.
    
*   Dew point.
    
*   Wet-bulb temperature.
    
*   Rain amount.
    
*   Rain probability.
    
*   Rain intensity.
    
*   Wind speed.
    
*   Wind direction.
    
*   Wind gusts.
    
*   Solar radiation.
    
*   Cloud cover.
    
*   Soil temperature.
    
*   Modelled soil moisture.
    
*   Reference evapotranspiration.
    
*   Thunderstorm indicators.
    
*   Forecast uncertainty.
    

3.2 Weather Data Confidence
---------------------------

Weather information should include a confidence classification.
Recommended hierarchy:
1.  On-field sensor.
    
2.  Trusted nearby weather station.
    
3.  Radar or satellite rainfall estimate.
    
4.  Weather-model estimate.
    
5.  Forecast value.
    
Oleachron must not present estimated rainfall as a confirmed field measurement.
Correct wording:

> The weather model estimates approximately 3 mm of rainfall at the field location.

Incorrect wording:

> Exactly 3 mm of rain fell inside the field.

3.3 Satellite Data
------------------

Oleachron may use:
*   NDVI.
    
*   NDMI.
    
*   NDRE.
    
*   Red-edge vegetation indicators.
    
*   Bare-soil indicators.
    
*   Burned-area indicators.
    
*   Field vegetation variability.
    
*   Percentage of low-vigour field area.
    
*   Difference from previous observation.
    
*   Difference from seasonal baseline.
    
*   Valid-pixel percentage.
    
*   Cloud contamination percentage.
    
Satellite data should normally generate inspection recommendations, not diagnoses.

3.4 Soil and Drought Data
-------------------------

Oleachron may use:
*   Modelled surface soil moisture.
    
*   Soil Water Index.
    
*   Soil-moisture anomaly.
    
*   Soil texture.
    
*   Estimated water-holding capacity.
    
*   Drought indicator.
    
*   Consecutive dry days.
    
*   Rainfall accumulation.
    
*   Climatic water deficit.
    
Regional soil-moisture data must be labelled as estimated regional context and not as a field sensor measurement.

3.5 Terrain and Field Data
--------------------------

Oleachron may use:
*   Field area.
    
*   Field polygon.
    
*   Mean elevation.
    
*   Mean slope.
    
*   Maximum slope.
    
*   Aspect.
    
*   Distance from watercourse.
    
*   Drainage conditions.
    
*   Soil texture.
    
*   Erosion risk.
    
*   Tree count.
    
*   Tree age.
    
*   Tree density.
    
*   Olive variety.
    
*   Irrigation method.
    
*   Rain-fed or irrigated status.
    
*   Organic or conventional production.
    

3.6 Official Data
-----------------

Oleachron may connect:
*   Ministry agricultural warnings.
    
*   Regional plant-protection bulletins.
    
*   Approved plant-protection-product records.
    
*   Product authorisation status.
    
*   Product label requirements.
    
*   Fire-danger information.
    
*   Frost forecasts.
    
*   Drought warnings.
    

* * *

4. Task Evaluation Statuses
===========================

| Status | Meaning |
| --- | --- |
| `SUITABLE` | Conditions appear acceptable. |
| `CAUTION` | The task may proceed, but one or more risks exist. |
| `RESCHEDULE_RECOMMENDED` | A better execution window is available. |
| `NOT_RECOMMENDED` | Weather or field conditions are unsuitable. |
| `HARD_CONFLICT` | A legal, label, safety, or mandatory interval restriction exists. |
| `COMPLETED_AT_RISK` | Conditions after task completion may have affected the result. |
| `FOLLOW_UP_REQUIRED` | A field inspection or corrective action should be considered. |
| `DATA_UNCERTAIN` | Data are missing, conflicting, outdated, or too coarse. |
Weather conditions should normally create recommendations.
`HARD_CONFLICT` should be reserved for verified restrictions such as:
*   Product not approved for olives.
    
*   Product not approved for the target pest or disease.
    
*   Wrong application method.
    
*   Maximum number of applications exceeded.
    
*   Minimum treatment interval not completed.
    
*   Pre-harvest interval not completed.
    
*   Re-entry interval not completed.
    
*   Product authorisation withdrawn or expired.
    
*   Confirmed legal restriction.
    
*   Product-label prohibition during flowering.
    
*   Confirmed incompatibility with another treatment.
    

* * *

5. Plant-Protection and Spraying Tasks
======================================

5.1 Required Task Information
-----------------------------

A spraying task should not contain only a generic description such as “Spray trees.”
The user should provide:
*   Product name.
    
*   Product authorisation number.
    
*   Active substance.
    
*   Mode-of-action group, where available.
    
*   Target pest or disease.
    
*   Dose.
    
*   Water volume.
    
*   Planned product quantity.
    
*   Planned application area.
    
*   Application method.
    
*   Foliar or soil application.
    
*   Planned start time.
    
*   Planned end time.
    
*   Operator.
    
*   Rainfast period.
    
*   Minimum application temperature.
    
*   Maximum application temperature.
    
*   Maximum wind speed.
    
*   Maximum wind gust.
    
*   Minimum interval before another application.
    
*   Pre-harvest interval.
    
*   Re-entry interval.
    
*   Maximum number of applications.
    
*   Relevant crop stage.
    
*   Flowering restrictions.
    
*   Bee-related restrictions.
    
*   Buffer-zone restrictions.
    
*   Distance from water restrictions.
    
Product-label values must override Oleachron defaults.

5.2 Data Evaluated Before Spraying
----------------------------------

Oleachron should evaluate:
*   Current wind speed.
    
*   Forecast wind speed during application.
    
*   Wind gusts.
    
*   Wind direction.
    
*   Rain during the planned task.
    
*   Rain during the rainfast period.
    
*   Rain probability.
    
*   Forecast rainfall amount.
    
*   Rain intensity.
    
*   Temperature.
    
*   Relative humidity.
    
*   Dew point.
    
*   Leaf-wetness probability.
    
*   Extreme heat.
    
*   Frost.
    
*   Thunderstorm risk.
    
*   Nearby fire danger.
    
*   Product approval for olives.
    
*   Product approval for the target pest.
    
*   Application-method approval.
    
*   Previous applications.
    
*   Maximum permitted applications.
    
*   Minimum application interval.
    
*   Pre-harvest interval.
    
*   Crop stage.
    
*   Flowering status.
    
*   Bee-sensitive period.
    
*   Official regional warning.
    
*   Recent use of the same mode-of-action group.
    
*   Nearby watercourse and buffer requirements.
    

5.3 Provisional Spraying Thresholds
-----------------------------------

These are general defaults requiring agronomist validation.
| Condition | Provisional Oleachron Result |
| --- | --- |
| Wind up to 10 km/h | Suitable |
| Wind 10–15 km/h | Caution |
| Wind 15–20 km/h | Not recommended |
| Wind above 20 km/h | Strong not-recommended warning |
| Gusts above 25 km/h | Not recommended |
| Rain during application | Reschedule recommended |
| Rain of at least 0.5 mm during the rainfast period | Not recommended |
| Rain probability at least 40% within six hours | Caution |
| Temperature above 30°C | Caution |
| Temperature above 35°C | Not recommended |
| Relative humidity below 35% | Caution |
| Thunderstorm risk | Reschedule recommended |
| Product not approved for olive | Hard conflict |
| Pre-harvest interval not completed | Hard conflict |
| Flowering and bee-sensitive product | Hard conflict or agronomist review |
| Required buffer zone cannot be maintained | Hard conflict |

5.4 Suggested Spraying Alert Messages
-------------------------------------

### Wind Warning

> Wind speeds are expected to exceed the selected application limit during the planned spraying period. Spray drift and uneven coverage may occur. Rescheduling is recommended.

### Rain Warning

> Rain is expected within the selected product’s rainfast period. Treatment effectiveness may be reduced. Consider selecting a later application window.

### Heat Warning

> The forecast temperature exceeds the recommended application range. Rapid evaporation, reduced coverage, or crop stress may occur.

### Product Restriction

> The selected product is not currently recorded as approved for this crop and target. The task should not proceed until the product label and authorisation are verified.

5.5 Monitoring After Spraying
-----------------------------

Oleachron should automatically create:
`SPRAY_RAINFAST_MONITOR`
Monitor period:
*   Start: actual task completion time.
    
*   End: completion time plus the product rainfast period.
    
Monitor:
*   Estimated rainfall.
    
*   Nearby-station rainfall.
    
*   User-reported rainfall.
    
*   Rain intensity.
    
*   Time between completion and rainfall.
    
*   Wind during actual application.
    
*   Wind gusts during actual application.
    
*   Temperature during application.
    
*   Unexpected irrigation.
    
*   Changes in forecast confidence.
    

5.6 Post-Spraying Rules
-----------------------

| Condition | Result |
| --- | --- |
| Rain detected during known rainfast period | Completed at risk |
| Small estimated rain with low-confidence data | Data uncertain |
| More than 2 mm shortly after treatment and no rainfast value available | Completed at risk |
| More than 5 mm shortly after treatment and no rainfast value available | High-severity alert |
| Irrigation during rainfast period | Completed at risk |
| Wind exceeded limit during task | Completed at risk |
| Product interval prevents immediate repeat application | Hard conflict for repeat task |
Example:

> Approximately 3.4 mm of rainfall was estimated 1 hour and 40 minutes after treatment. The selected product requires a four-hour rain-free period. Treatment effectiveness may have been reduced. Do not repeat the application automatically. Review the product label or consult an agronomist.

Oleachron must never automatically create a repeat pesticide application.

* * *

6. Foliar Fertilisation Tasks
=============================

6.1 Required Information
------------------------

*   Product name.
    
*   Fertiliser composition.
    
*   Application dose.
    
*   Water volume.
    
*   Application area.
    
*   Planned start and end.
    
*   Rainfast period.
    
*   Temperature range.
    
*   Maximum wind.
    
*   Crop-stage restrictions.
    
*   Compatibility restrictions.
    
*   Leaf-condition requirements.
    

6.2 Data to Evaluate
--------------------

*   Wind speed.
    
*   Wind gusts.
    
*   Rain during application.
    
*   Rain during rainfast period.
    
*   Temperature.
    
*   Relative humidity.
    
*   Leaf wetness.
    
*   Heat stress.
    
*   Frost.
    
*   Crop stage.
    
*   Recent pesticide application.
    
*   Product compatibility.
    

6.3 Provisional Decisions
-------------------------

| Condition | Action |
| --- | --- |
| Strong wind | Delay |
| Rain during application | Delay |
| Rain within rainfast period | Completed at risk or reschedule |
| Extreme heat | Delay |
| Very dry air | Caution |
| Leaves already wet | Product-dependent warning |
| Conflict with recent spray | Agronomist review |

* * *

7. Soil-Applied and Granular Fertilisation Tasks
================================================

7.1 Required Information
------------------------

*   Product name.
    
*   Nitrogen percentage.
    
*   Phosphorus percentage.
    
*   Potassium percentage.
    
*   Micronutrients.
    
*   Granular, liquid, or organic form.
    
*   Slow-release or conventional.
    
*   Planned quantity.
    
*   Application area.
    
*   Application method.
    
*   Incorporation requirement.
    
*   Irrigation requirement.
    
*   Recommended rainfall range.
    
*   Maximum tolerated rainfall.
    
*   Minimum soil-moisture condition.
    

7.2 Data to Evaluate
--------------------

*   Rainfall during previous days.
    
*   Forecast rainfall.
    
*   Rain intensity.
    
*   Soil-moisture estimate.
    
*   Soil texture.
    
*   Field slope.
    
*   Distance from streams.
    
*   Drainage condition.
    
*   Irrigation schedule.
    
*   Drought condition.
    
*   Fire danger when machinery is used.
    

7.3 Provisional Fertilisation Thresholds
----------------------------------------

| Condition | Provisional Result |
| --- | --- |
| Very dry soil and no rain or irrigation expected | Delay or request incorporation plan |
| Forecast rain of 2–8 mm | Potentially favourable, with caution |
| Forecast rain of 8–15 mm | Agronomist review |
| Forecast rain above 15 mm in 24 hours | Not recommended |
| Steep slope and more than 10 mm rain | Strong runoff warning |
| Saturated soil | Delay |
| Heavy rain after application | Follow-up inspection |
| Nearby watercourse and runoff risk | Strong environmental warning |
Example:

> Fertilisation is planned approximately six hours before an estimated 22 mm rainfall event. The field has a mean slope of 13%. Nutrient movement, leaching, or runoff may occur. Rescheduling is recommended.

7.4 Post-Fertilisation Monitoring
---------------------------------

Create:
`FERTILISER_RAIN_MONITOR`
Monitor:
*   Rainfall amount.
    
*   Maximum hourly rainfall.
    
*   Soil saturation.
    
*   Field slope.
    
*   Distance from water.
    
*   Irrigation after fertilisation.
    
*   Runoff-risk estimate.
    
Possible follow-up:

> Inspect the lower part of the field for runoff, local nutrient accumulation, or fertiliser movement.

* * *

8. Irrigation Tasks
===================

8.1 Required Information
------------------------

*   Irrigation method.
    
*   Drip, sprinkler, basin, or other.
    
*   Irrigation capacity.
    
*   Planned duration.
    
*   Planned water quantity.
    
*   Field area.
    
*   Tree count.
    
*   Tree age.
    
*   Tree density.
    
*   Soil texture.
    
*   Root-zone depth.
    
*   Irrigation efficiency.
    
*   Crop stage.
    
*   Last irrigation date.
    
*   Last irrigation amount.
    

8.2 Data to Evaluate
--------------------

*   Reference evapotranspiration.
    
*   Rainfall during previous 7, 14, and 30 days.
    
*   Forecast rainfall.
    
*   Effective rainfall.
    
*   Previous irrigation.
    
*   Modelled soil moisture.
    
*   Soil texture.
    
*   Drought conditions.
    
*   Heatwave forecast.
    
*   Irrigation method.
    
*   Wind for sprinkler irrigation.
    
*   Recent foliar spraying.
    
*   Rainfast restrictions.
    

8.3 Provisional Irrigation Logic
--------------------------------

Estimated climatic deficit:
`Accumulated ET₀ - effective rainfall - recorded irrigation`
A crop coefficient may later be applied according to:
*   Crop stage.
    
*   Tree age.
    
*   Canopy size.
    
*   Planting density.
    
*   Ground cover.
    
*   Irrigation method.
    

8.4 Provisional Irrigation Rules
--------------------------------

| Condition | Action |
| --- | --- |
| Expected effective rain exceeds estimated deficit | Suggest cancelling irrigation |
| Moderate rain expected | Suggest reducing duration or volume |
| Heavy rain expected | Reschedule |
| Soil-moisture estimate is high | Waterlogging warning |
| Heatwave approaching | Recommend earlier irrigation window |
| Strong wind with sprinkler irrigation | Reschedule or adjust |
| Strong wind with drip irrigation | Usually no major effect |
| Irrigation during spray rainfast period | Conflict warning |
| Saturated soil | Delay irrigation |
Example:

> The planned irrigation is equivalent to approximately 12 mm. Oleachron estimates a current climatic deficit of 7 mm and approximately 9 mm of effective rainfall tomorrow. Cancelling or reducing irrigation is recommended.

Exact litres per tree should only be displayed when field and irrigation-system data are sufficiently complete.

* * *

9. Pruning Tasks
================

9.1 Required Information
------------------------

*   Pruning type.
    
*   Light, production, renewal, sanitation, or severe pruning.
    
*   Planned date.
    
*   Estimated duration.
    
*   Equipment used.
    
*   Branch-disposal method.
    
*   Crop stage.
    
*   Tree age.
    
*   Disease concerns.
    
*   Whether wound treatment is planned.
    

9.2 Data to Evaluate
--------------------

*   Rain during pruning.
    
*   Rain after pruning.
    
*   Prolonged humidity.
    
*   Estimated leaf wetness.
    
*   Frost forecast.
    
*   Extreme heat.
    
*   Strong wind.
    
*   Fire danger.
    
*   Crop stage.
    
*   Official disease warnings.
    

9.3 Provisional Pruning Rules
-----------------------------

| Condition | Action |
| --- | --- |
| Rain during pruning | Reschedule |
| Rain within 24 hours | Caution |
| Prolonged wet period after pruning | Not recommended |
| Frost within 48 hours | Reschedule |
| Temperature above 35°C | Reschedule |
| Gusts above 40 km/h | Worker-safety warning |
| Very high fire danger | Machinery and branch-disposal warning |
| Active disease warning and prolonged wetness | Agronomist review |

9.4 Post-Pruning Monitoring
---------------------------

Monitor for at least 48 hours:
*   Rainfall.
    
*   High humidity.
    
*   Leaf-wetness duration.
    
*   Frost.
    
*   Extreme heat.
    
Create an inspection recommendation when prolonged wet conditions occur.

9.5 Satellite Interpretation After Pruning
------------------------------------------

Pruning can reduce NDVI, NDRE, or canopy-cover indicators.
Oleachron should:
*   Record the pruning date.
    
*   Temporarily mark satellite comparisons as task-affected.
    
*   Avoid classifying the decline automatically as plant stress.
    
*   Compare the next observations against expected post-pruning behaviour.
    

* * *

10. Tillage and Soil-Work Tasks
===============================

10.1 Required Information
-------------------------

*   Type of cultivation.
    
*   Machinery type.
    
*   Working depth.
    
*   Planned area.
    
*   Purpose.
    
*   Weed control, incorporation, soil loosening, or preparation.
    
*   Expected exposed-soil percentage.
    

10.2 Data to Evaluate
---------------------

*   Surface soil moisture.
    
*   Rain during the previous 72 hours.
    
*   Forecast heavy rain.
    
*   Soil texture.
    
*   Field slope.
    
*   Vegetation cover.
    
*   Erosion risk.
    
*   Wind.
    
*   Fire danger.
    
*   Machinery weight.
    

10.3 Provisional Rules
----------------------

| Condition | Action |
| --- | --- |
| Wet soil and heavy machinery | Delay because of compaction risk |
| Bare soil, steep slope, and heavy rain forecast | Strong erosion warning |
| Extremely dry soil and strong wind | Dust and erosion warning |
| Saturated low areas | Avoid machinery |
| Very high fire danger | Machinery-use warning |
Example:

> Soil conditions may be too wet for heavy machinery. Proceeding may increase soil compaction and damage soil structure.

* * *

11. Mowing and Vegetation-Control Tasks
=======================================

11.1 Required Information
-------------------------

*   Mowing method.
    
*   Machinery used.
    
*   Target vegetation height.
    
*   Whether residues remain or are removed.
    
*   Planned area.
    
*   Fire-prevention purpose.
    
*   Soil-disturbance level.
    

11.2 Data to Evaluate
---------------------

*   Vegetation dryness.
    
*   Fire danger.
    
*   Wind.
    
*   Temperature.
    
*   Soil moisture.
    
*   Field slope.
    
*   Nearby fire detections.
    
*   Rain forecast.
    

11.3 Provisional Rules
----------------------

| Condition | Action |
| --- | --- |
| Very high fire danger and dry vegetation | Strong safety warning |
| High temperature and machinery use | Caution |
| Strong wind and dry residues | Fire-spread warning |
| Heavy rain immediately after soil-disturbing mowing | Erosion warning |
| Moderate fire risk before dry period | Potentially favourable task window |

* * *

12. Harvest Tasks
=================

12.1 Required Information
-------------------------

*   Planned harvest start.
    
*   Planned harvest end.
    
*   Harvest method.
    
*   Manual or mechanical.
    
*   Number of workers.
    
*   Last pesticide application.
    
*   Relevant pre-harvest intervals.
    
*   Expected production.
    
*   Transport and storage availability.
    

12.2 Data to Evaluate
---------------------

*   Pre-harvest interval for every recent product.
    
*   Rain during harvest.
    
*   Rain before harvest.
    
*   Fruit wetness.
    
*   Soil and access conditions.
    
*   Strong wind.
    
*   Extreme heat.
    
*   Fire danger.
    
*   Recent pest warnings.
    
*   Recent fruit-damage observations.
    

12.3 Mandatory Pre-Harvest Rule
-------------------------------

Earliest permitted harvest date:
`Last application date + product pre-harvest interval`
The system must evaluate all relevant recent applications.
The latest resulting permitted date should be used.
Example:

> Harvest cannot be marked as suitable before 18 October. A pesticide applied on 4 October has a minimum pre-harvest interval of 14 days.

12.4 Provisional Harvest Rules
------------------------------

| Condition | Action |
| --- | --- |
| Pre-harvest interval not completed | Hard conflict |
| Rain during harvest | Reschedule recommendation |
| Heavy rain during previous 24 hours | Access and wet-fruit warning |
| Strong wind or gusts above 40 km/h | Worker-safety warning |
| Temperature above 35°C | Recommend earlier working hours |
| Nearby active fire | Emergency warning |
| Saturated soil | Machinery-access warning |

* * *

13. Pest and Disease Inspection Tasks
=====================================

13.1 Trigger Sources
--------------------

Inspection tasks may be created from:
*   Official agricultural warnings.
    
*   User observations.
    
*   Trap-count changes.
    
*   Suitable weather for pest or disease development.
    
*   Satellite anomaly.
    
*   Neighbouring field reports.
    
*   Historical seasonal pattern.
    

13.2 Required Information
-------------------------

*   Target pest or disease.
    
*   Inspection area.
    
*   Trap type.
    
*   Number of traps.
    
*   Symptoms to check.
    
*   Fruit sample size.
    
*   Leaf sample size.
    
*   Previous inspection result.
    
*   Crop stage.
    

13.3 Possible Inspection Outputs
--------------------------------

*   No issue observed.
    
*   Symptoms observed.
    
*   Trap count entered.
    
*   Sample required.
    
*   Agronomist review required.
    
*   Treatment consideration.
    
*   Re-inspection date.
    
Oleachron should not convert weather suitability directly into a disease diagnosis.
Correct:

> Weather conditions have been favourable for infection. Inspect leaves and young shoots.

Incorrect:

> The field has the disease.

* * *

14. Satellite-Triggered Inspection Tasks
========================================

14.1 Vegetation Decline
-----------------------

Possible trigger:
*   NDVI decline greater than 10%.
    
*   Valid pixels above 70%.
    
*   No recent pruning.
    
*   No severe cloud contamination.
    
*   No known harvest or canopy-removal task.
    
Recommended task:

> Inspect the affected zone for water stress, pest or disease symptoms, machinery damage, grazing, or other canopy loss.

14.2 Moisture Decline
---------------------

Possible trigger:
*   NDMI decline.
    
*   No significant rainfall for 10–14 days.
    
*   High accumulated evapotranspiration.
    
*   Soil-moisture trend declining.
    
Recommended task:

> Check soil moisture, irrigation emitters, leaks, blockages, and tree water-stress symptoms.

14.3 Uneven Field Condition
---------------------------

Possible trigger:
*   Lower vegetation-index quartile is more than 20% below field median.
    
*   An affected spatial zone is identifiable.
    
*   Observation contains sufficient valid pixels.
    
Recommended task:

> Inspect the low-vigour field zone and compare soil, irrigation, pests, tree age, and management history.

14.4 Monitoring After Irrigation or Fertilisation
-------------------------------------------------

Oleachron may compare later satellite observations.
Permitted wording:
*   Vegetation indicators improved.
    
*   Vegetation indicators remained stable.
    
*   Vegetation indicators declined.
    
*   The observation is inconclusive because of cloud cover or insufficient time.
    
Prohibited wording:
*   The fertilisation definitely worked.
    
*   The irrigation solved the problem.
    
*   The crop is healthy based only on NDVI.
    

* * *

15. Official Agricultural Warning Tasks
=======================================

15.1 Matching Criteria
----------------------

A bulletin should be matched using:
*   Crop.
    
*   Region.
    
*   Regional unit.
    
*   Pest or disease.
    
*   Publication date.
    
*   Validity period.
    
*   Crop stage.
    
*   Altitude or local zone, where included.
    

15.2 System Actions
-------------------

When a bulletin matches a field:
1.  Attach the bulletin to the field.
    
2.  Inform the field owner or producer.
    
3.  Create an inspection recommendation.
    
4.  Request trap counts or symptom observations.
    
5.  Show the relevant crop stage.
    
6.  Show the bulletin publication date.
    
7.  Require an approved product if treatment is later created.
    
Example:

> A new official olive warning applies to Messinia and reports increased olive-fruit-fly activity. Check traps and fruit samples in this field within the next two days.

Oleachron should not automatically create a spraying task from every official warning.

* * *

16. Fire, Frost, Flood, and Extreme-Weather Tasks
=================================================

16.1 Fire Alerts
----------------

Data:
*   Fire Weather Index.
    
*   Official fire-danger class.
    
*   Nearby active fire.
    
*   Distance from active fire.
    
*   Wind.
    
*   Temperature.
    
*   Vegetation dryness.
    
Possible actions:
*   Warn against spark-producing machinery.
    
*   Warn against branch burning.
    
*   Reschedule mowing or soil work.
    
*   Notify the user of nearby fire activity.
    
*   Create a post-fire inspection task.
    

16.2 Frost Alerts
-----------------

Data:
*   Minimum forecast temperature.
    
*   Frost duration.
    
*   Crop stage.
    
*   Recent pruning.
    
*   Recent irrigation.
    
*   Field elevation.
    
*   Low-lying terrain.
    
Possible actions:
*   Reschedule pruning.
    
*   Reschedule sensitive spraying.
    
*   Recommend field inspection after frost.
    
*   Monitor visible damage.
    

16.3 Flood and Waterlogging Alerts
----------------------------------

Data:
*   Heavy-rain forecast.
    
*   Soil saturation.
    
*   Field slope.
    
*   Low field areas.
    
*   Distance from watercourse.
    
*   Recent accumulated rainfall.
    
Possible actions:
*   Cancel irrigation.
    
*   Delay machinery.
    
*   Delay fertilisation.
    
*   Inspect drainage.
    
*   Inspect runoff and erosion after rainfall.
    

* * *

17. Conditions That Modify Every Rule
=====================================

The same environmental condition should not create the same decision for every task.
Rules must be adjusted according to:
*   Task type.
    
*   Product.
    
*   Product formulation.
    
*   Application method.
    
*   Foliar or soil application.
    
*   Olive variety.
    
*   Crop stage.
    
*   Flowering status.
    
*   Expected harvest date.
    
*   Irrigated or rain-fed production.
    
*   Irrigation method.
    
*   Soil texture.
    
*   Field slope.
    
*   Tree age.
    
*   Tree density.
    
*   Canopy size.
    
*   Organic or conventional management.
    
*   Field size.
    
*   Machinery use.
    
*   Agronomist configuration.
    
*   Data confidence.
    
*   Distance from weather station.
    
*   Age of satellite observation.
    
*   Recent field tasks.
    
Examples:
*   Wind strongly affects spraying.
    
*   Wind has little effect on drip irrigation.
    
*   Light rain may reduce a foliar treatment.
    
*   Light rain may help dissolve granular fertiliser.
    
*   Heavy rain may move fertiliser through runoff.
    
*   NDVI decline after pruning may be expected.
    
*   NDVI decline without pruning may require inspection.
    
*   High humidity may increase disease risk but may improve some spraying conditions.
    
*   Dry soil may justify irrigation but may make cultivation difficult.
    
*   Wet soil may reduce irrigation need but increase machinery compaction risk.
    

* * *

18. Rule Priority
=================

When two rules conflict, use the following priority:
1.  Legal restriction.
    
2.  Official product label.
    
3.  Worker and public safety.
    
4.  Environmental protection restriction.
    
5.  Official agricultural warning.
    
6.  Agronomist-specific rule.
    
7.  Farm-specific rule.
    
8.  Product-specific agronomic recommendation.
    
9.  Oleachron crop-specific default.
    
10.  Oleachron generic default.
    
A lower-priority rule must never override a higher-priority rule.

* * *

19. Alert Structure
===================

Every Oleachron warning should include:
*   Field name.
    
*   Task name.
    
*   Severity.
    
*   Evaluation status.
    
*   Triggering condition.
    
*   Observed or forecast value.
    
*   Rule threshold.
    
*   Data source.
    
*   Data confidence.
    
*   Time of evaluation.
    
*   Recommended action.
    
*   Alternative task window, where possible.
    
*   Whether agronomist review is recommended.
    
Example:

> **Spraying reschedule recommended**  
> Wind gusts of up to 29 km/h are forecast during the planned application. The current task limit is 25 km/h. A lower-wind window is expected tomorrow between 06:00 and 09:00. Forecast confidence is medium.

* * *

20. Agronomist Validation Checklist
===================================

The reviewing agricultural expert should confirm or modify the following.

20.1 Spraying
-------------

*   Appropriate wind thresholds.
    
*   Appropriate gust thresholds.
    
*   Appropriate humidity thresholds.
    
*   Temperature thresholds by product type.
    
*   Rain probability threshold.
    
*   Rain amount threshold.
    
*   Default rainfast assumptions.
    
*   Flowering and bee restrictions.
    
*   Required buffer zones.
    
*   Resistance-management checks.
    
*   Repeat-application handling.
    

20.2 Fertilisation
------------------

*   Useful rainfall range after granular fertilisation.
    
*   Rainfall amount that creates runoff risk.
    
*   Rainfall amount that creates leaching risk.
    
*   Soil-moisture restrictions.
    
*   Slope thresholds.
    
*   Differences between nitrogen, phosphorus, potassium, and organic fertilisers.
    
*   Incorporation requirements.
    

20.3 Irrigation
---------------

*   Crop coefficient by olive growth stage.
    
*   Water-stress thresholds.
    
*   Effective rainfall calculation.
    
*   Soil-texture adjustment.
    
*   Irrigation recommendations by system type.
    
*   Maximum safe irrigation under saturated conditions.
    

20.4 Pruning
------------

*   Frost avoidance period.
    
*   Rain avoidance period.
    
*   Wetness duration risk.
    
*   Heat thresholds.
    
*   Disease-specific pruning restrictions.
    
*   Post-pruning inspection timing.
    

20.5 Harvest
------------

*   Pre-harvest interval calculation.
    
*   Wet-fruit restrictions.
    
*   Machinery-access conditions.
    
*   Temperature and worker-safety thresholds.
    
*   Rainfall effect on harvesting and fruit quality.
    

20.6 Satellite Rules
--------------------

*   Appropriate NDVI decline threshold.
    
*   Appropriate NDMI decline threshold.
    
*   Minimum valid-pixel percentage.
    
*   Minimum field size.
    
*   Pruning adjustment period.
    
*   Harvest adjustment period.
    
*   Seasonal baseline calculation.
    
*   Conditions requiring inspection.
    

20.7 Official Warnings
----------------------

*   How bulletins should be geographically matched.
    
*   How crop stage should be matched.
    
*   When an inspection task should be mandatory.
    
*   When treatment should only be considered after trap or symptom evidence.
    

* * *

21. Recommended Initial Oleachron Scope
=======================================

The first production version should support:
1.  Structured spraying tasks.
    
2.  Structured fertilisation tasks.
    
3.  Structured irrigation tasks.
    
4.  Structured pruning tasks.
    
5.  Structured harvest tasks.
    
6.  Weather suitability evaluation.
    
7.  Best task-window recommendation.
    
8.  Post-spraying rainfall monitoring.
    
9.  Post-fertilisation heavy-rain monitoring.
    
10.  Irrigation cancellation or reduction recommendations.
    
11.  Pre-harvest interval conflict detection.
    
12.  Official warning matching.
    
13.  Satellite anomaly inspection tasks.
    
14.  Confidence labels for every environmental value.
    
15.  Agronomist-configurable thresholds.
    

* * *

22. Recommended First Expert Review Outcome
===========================================

The agronomist should provide, for every rule:
*   Approved.
    
*   Approved with changes.
    
*   Product-specific only.
    
*   Crop-stage-specific only.
    
*   Field-specific only.
    
*   Requires more data.
    
*   Should not be automated.
    
*   Requires a legal or label check.
    
*   Recommended user message.
    
*   Recommended severity.
    
*   Recommended follow-up action.
    
A rule should not enter production until its source and authority are recorded.
Recommended rule-source values:
*   `LEGAL_REQUIREMENT`
    
*   `OFFICIAL_PRODUCT_LABEL`
    
*   `OFFICIAL_BULLETIN`
    
*   `AGRONOMIST_APPROVED`
    
*   `SCIENTIFIC_REFERENCE`
    
*   `FARM_CONFIGURATION`
    
*   `Oleachron_PROVISIONAL_DEFAULT`
    

* * *

23. Final Product Principle
===========================

Oleachron should not simply collect weather and satellite data.
It should explain how those data affect real field work.
The platform should help the user answer:
*   Can I perform this task safely today?
    
*   What is the best time to perform it?
    
*   Should I delay or cancel it?
    
*   Did weather after completion possibly reduce its effectiveness?
    
*   Does this task conflict with a previous treatment?
    
*   Is a follow-up inspection required?
    
*   Is the recommendation based on measured or estimated data?
    
*   Which rule, product label, or warning produced the recommendation?
    
The intended product message is:

> Oleachron monitors every field task before, during, and after execution and warns the user when weather, field conditions, crop stage, or treatment restrictions may affect the result.