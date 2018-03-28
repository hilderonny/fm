# APIs

## datatypes

The datatypes and datatypefields collections are no dynamic objects and therefore need a separate API.

|API endpoint|description|
|:---|:---|
|/|Get all datatypes. With the test query parameter ```forlist``` one can define, which list definition a datatype must match to be returned. This is useful for filtering datatypes for select boxes (e.g. fmobjects)|

## dynamic

This API is a generalized API for accessing all possible dynamic objects.

|API endpoint|description|
|:---|:---|
|/parentpath/:recordtypename/:entityname|Get the name of all parents of an entity. The parents are obtained by walking the ```parentchild``` relations. The parents are ordered by the root element first. Useful for building breadcrumbs|
|/:recordtypename|Retreive a list of dynamic objects of a given ```recordtypename```. Passing URL parameters will result in AND filtering the results. E.g. giving ```?isactive:true``` will return all entites where the ```isactive``` attribute is set to ```true```|


# Forbidden record type names

Later when we have an import function from other systems, the available names of the record types are restricted due to the use of keywords in the dynamic api. Following names are forbidden to be used.

- parentpath
- children
- rootelements