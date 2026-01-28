# Trajectory

### Audit the Original Code (Identify Scaling Problems)

I audited the original SensorMetricsController. It relied on a class-level variable (cachedReadings) which causes race conditions in a singleton environment, 
used raw Map types that obscured the data contract for the return, and had loops that were not 
needed and nested and some were really inefficent to get the data for a single sensor, out the request body was done in a static class which causes two problems first it will cause problems because more than

### 1.Define a Performance Contract First

I introduced strongly typed Data Transfer Objects (DTOs), SensorMetricRequest and SensorMetricResponse, to explicitly define the input/output shape. This replaces the unstructured Map<String, String> and allows for compile-time safety and clearer API contracts and the static class with in the Sensor Metrics Controller.

### 3.Changed how sensor specific data is extracted from the reading list

I eliminated O(n`2) by removing the nested loop that was not doing anything and just got the data by using 2 O(N) loops and an accumilator class

## Added validation on the inputs to check if it is valid
