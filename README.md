# Installation

## Als Dienst unter Linux

Für den Dienst eine Datei unter ```/etc/systemd/system/Dienstname.service``` mit folgendem Inhalt anlegen:

```
[Unit]
Description=Arrange portal

[Service]
ExecStart=/usr/bin/node /var/www/arrange/app.js
WorkingDirectory=/var/www/arrange
Restart=always
RestartSec=10
StandardOutput=syslog
StandardError=syslog
SyslogIdentifier=arrange

[Install]
WantedBy=multi-user.target
```

Hier ist dabei der Eintrag ```SyslogIdentifier``` wichtig. Dieser definiert, wie der Dienst beim Start angesprochen wird.
Der Dienst kann dann per ```service arrange start|stop|restart``` gesteuert werden.

Um den Neustart nach Updates zu erzwingen, muss eine Shell-Befehlskette in der localconfig eingetragen werden, die den Neustart herbeiführt und dabei eventuell neue Pakete installiert. Für Linux sieht das so aus (an Portal anpassen):

```
"restartcommand": "cd /var/www/fmdev && /usr/sbin/service fmdev.avorium.de stop && npm install >> /var/log/syslog && /usr/sbin/service fmdev.avorium.de start"
```
