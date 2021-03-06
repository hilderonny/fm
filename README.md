![](https://teamcity.avorium.de/app/rest/builds/aggregated/strob:(buildType:(project:(id:AVT_FacilityManagement)))/statusIcon.svg)

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

Für Windows-Dienste, die mit ```installwindowsservice.js``` eingerictet wurden, kann so ein Befehl so aussehen (auf die vielen Anführungszeichen achten, Quoting innerhalb Quoting):

```
"restartcommand": "cmd /c \"c: && cd \iprocloud\www & net stop \"\"IPROCLOUD\"\" & npm install & net start \"\"IPROCLOUD\"\"\""
```


## Installation auf Raspberry PI 1

Die derzeit neueste Version von PostgreSQL, die man auf dem Raspi installieren kann, ist die 9.6 (reicht aber für arrange). Das geht aber nur unter Raspbian ß (Debian stretch). Die installierte Raspbian-Version bekommt man mit ```cat /etc/os-version``` heraus. Zuerst wird Postgresql installiert.

Will man von jessie upgraden, muss man folgende Befehle eintippen (dauert einige Zeit, von https://linuxconfig.org/raspbian-gnu-linux-upgrade-from-jessie-to-raspbian-stretch-9).

```
apt-get update
apt-get upgrade
apt-get dist-upgrade
sed -i 's/jessie/stretch/g' /etc/apt/sources.list
apt-get update
apt-get upgrade
apt-get dist-upgrade
apt-get autoremove
```

Die PostgreSQL Datenbank wird dann so installiert:

```
apt-get install postgresql-9.6
```

Damit man von NodeJS oder von woanders auf die Datenbank zugreifen kann, muss dem Benutzer ```postgres``` ein Passwort vergeben werden:

```
sudo -u postgres psql postgres
```

Und dann in der Posgres-Sell:

```
\password postgres
```

Danach kann man mit jedem Linux Benutzer per psql DBNAME postgres auf die Datenbank zugreifen.

Als nächstes auf dem Lizenzserver ein Portal anlegen und den Download-Link kopieren. Auf dem PI mit dem Befehl ```wget -O portal.zip DOWNLOADLINK``` herunterladen und mit ```unzip portal.zip``` entpacken.

Danach die Datei ```config/localconfig.json.template``` in ```config/localconfig.json``` umbenennen und Inhalt anpassen. Dabei die Lizenzserver-URL und den Schlüssel eintragen. Als Datenbank-Host 127.0.0.1 eintragen, da Postgres auch auf dem PI läuft (localhost ginge auch, aber nur, wenn immer eine Netzwerkverbindung besteht). Der Standardport von Postgres ist 5432. Als NPM Install command sollte ```/usr/binnpm install``` angegeben werden.

Soll der Server per HTTPS erreichbar sein (sinnvoll für WebRTC und so), müssen im Stammverzeichnis die Dateien ```priv.key``` und ```pub.cert``` vorhanden sein. Für lokale Installationen können die aus diesem Repository verwendet werden.

Zum Schluss wird noch ein Service angelegt, der das Portal im Hintergrund laufen lässt. Dazu folgenden Inhalt in die Datei ```/etc/systemd/system/arrange.service```
kopieren und anpassen ...

```
[Unit]
Description=arrange

[Service]
ExecStart=/usr/bin/node /ARRANGEVERZEICHNIS/app.js
WorkingDirectory=/ARRANGEVERZEICHNIS
Restart=always
RestartSec=10
StandardOutput=syslog
StandardError=syslog
SyslogIdentifier=arrange

[Install]
WantedBy=multi-user.target
```

und danach diese Befehle im arrange-Verzeichnis ausführen:
```
npm install
node app.js (Wenn alles mindestens zweimal gut hochläft, dann die nächsten Befehle ausführen)
systemctl enable arrange
systemctl start arrange
```

Nun läuft der Server und kann per Webbrowser mit den Credentials "admin"/"admin" aufgerufen werden.