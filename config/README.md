# module-config.json

## clientdatatypes / portaldatatypes

### Datatype

|Field|Description|
|:--|:--|
|name|API name of the datatype|
|label|Label of the datatype which is shown in Record type administration|
|plurallabel|Plural label to be used in list headers in record type administration|
|titlefield|Name of the field which is used as label in lists and so|
|icon|URL of icon to use for the record type everywhere it is shown|
|ismanuallyupdated|Automatically set to true when a recordtype definition is manually updated wo that the checks on startup will not overwrite labels and so|
|fields|List of fields of the datatype|
|lists|List of possible places where the datatype is shown in hierarchies or lists, e.g. ```fmobjects``` or ```folders```|
|permissionkey|Permission key which is required to access entities of this datatype|
|canhaverelations|Defines whether the type can have relations and so should be shown in relation menus|
|candefinename|When set to true, the name of an object can be defined in POST-API on creation (e.g. for users)|

### Field

|Field|Description|
|:--|:--|
|formula|Formula of the field when type is ```formula``` as JSON object|
|formulaindex|Index number which defines in which order the formulas of the element are calculated|
|isnullable|Used for ```reference``` type to show that the reference can also be null (not defined)|
|name|API name of the field|
|label|Label of the field to be shown above input fields, not used for type ```reference```|
|type|Type of field. Can be ```text```, ```decimal```, ```boolean```, ```datetime```, ```formula```, ```reference```|
|isrequired|Boolean value to define whether the input of a field value is required or not|
|reference|API Name of the recordtype which is referenced in picklists when type is ```reference```|
|rows|Number of rows which should be shown for textfields|
|ishidden|When set to true, the field should not be shown in client apps|

### Types

|Type|Description|
|:--|:--|
|text|Any text, shows simple input field|
|decimal|Any number with or without decimal places, shows simple input field|
|boolean|```true``` or ```false```, shows checkbox|
|datetime|Technically a timestamp in milliseconds, shows datepicker in UI|
|password|Encrypted password|
|reference|Picklist of optiones references by this field|
|formula|Defines that the value of the field is calculated by a formula each time the element or on of its children updates|

### Formulas

|Formula|Description|
|:--|:--|
|childsum:A|Summarizes the field named "A" of all childelements. When a child has no such field, then ```0``` is assumed as value of the child|
|ifthenelse:[A,B,C,D]|When the field named "A" has the concrete value "B" then the value of the field named "C" is used, otherwise the discrete value "D" is returned|
|sum:[A,...]|Summarizes the values of all of the given field names of the element. Prefixing a field name with "-" negates the value of the field|
