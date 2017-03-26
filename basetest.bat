@ECHO OFF
REM Basistests für Grundfunktionen (app-packager, module-config, etc.)
REM Genügt, um bei kleinen Änderungen Auswirkungen auf Basisfunktionen zu testen
REM oder um zu gucken, ob man in der config irgendwas vergessen hat
CALL npm run-script basetest