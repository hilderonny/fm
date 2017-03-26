
/**
 * List of all possible permission keys. Used for authentication.
 */
module.exports.allPermissionKeys = [
    'PERMISSION_ADMINISTRATION_CLIENT', // Mandant erstellen, bearbeiten und löschen
    'PERMISSION_ADMINISTRATION_PERMISSION', // Berechtigungen vergeben und ändern
    'PERMISSION_ADMINISTRATION_SETTINGS', // Berechtigung zum Zugriff auf Einstellungsmenü
    'PERMISSION_ADMINISTRATION_USER', // Benutzer erstellen, ändern und löschen
    'PERMISSION_ADMINISTRATION_USERGROUP', // Benutzergruppen erstellen, ändern und löschen
    'PERMISSION_BIM_FMOBJECT', // FM-Objekte erstellen, ändern und löschen
    'PERMISSION_LICENSESERVER_PORTAL', // Portale erstellen, ändern und löschen
    'PERMISSION_OFFICE_ACTIVITY', // Termine erstellen, ändern und löschen
    'PERMISSION_OFFICE_DOCUMENT', // Dokumente erstellen, ändern und löschen
    'PERMISSION_SETTINGS_CLIENT', // Einstellungen auf Mandantenebene ändern (Logo im Menü, Module selbst freischalten)
    'PERMISSION_SETTINGS_PORTAL', // Einstellungen auf Portalebene ändern (Logo auf Anmeldebildschirm, Lizenzdaten)
    'PERMISSION_SETTINGS_USER', // Einstellungen auf Benutzerebene ändern (eigenes Passwort oder Benutzername)
];

/**
 * List of all possible collections (tables). Used for dependency deletions in clients API
 * and its tests
 */
module.exports.collections = [
    'activities',
    'clientmodules',
    'clients',
    'documents',
    'fmobjects',
    'folders',
    'markers',
    'permissions',
    'portalmodules',
    'portals',
    'relations',
    'settingsets',
    'usergroups',
    'users'
]