# API Helper

## createApi

Configuration settings:

|Property|Description|
|--|--|
|apiname|Name of the API and of the database table. Defines the Sub-URL of the API and in which database table the elements are stored.|
|children|Array of definitions of possible child elements. Required for handling deletions of child elements correctly.|
|children.datatypename|Table name of the child|
|children.parentfield|Field name in the child table which references the parent entity|
|delete|Set to true to include an endpoint DELETE/:id to delete an existing object or define a filter function.|
|getall|Set to true to include an endpoint for GET/ to retreive all elements available to the logged in user. Or define an array of filter functions (see activities API) |
|getforids|Set to true to include an endpoint for GET/forIds/ to retreive elements for given ids|
|getid|Set to true to include an endpoint for GET/:id to retreive a specific object. Set to a function (see activities) to handle special behaviour.|
|mapfields|Mapping information for data coming out of the database. Clients expect another data structure so this mapping is for converting it.|
|mapfieldsreverse|Reverse mapping for data coming from the client which is to be inserted or put into the database|
|modulename|Name of the module the API belongs to (must match the name defined in module-config.json)|
|parent|When set, the datatype of the API contains a reference to a parent entity. Used for providing GET/for"parent"/:id endpoint to retreive all children of a parent|
|parent.datatypename|Table name of the parent|
|parent.apisuffix|API suffix to use when requesting the children. E.G. "forPerson" is used for API /communications/forPerson/:id|
|parent.parentfield|Fieldname containing the reference to the parent object|
|permission|Permission key required to access the API|
|post|Set to true to include an endpoint for POST/ to insert a new object|
|put|Set to true to include an endpoint for PUT/:id to update an existing object or define a filter function.|
