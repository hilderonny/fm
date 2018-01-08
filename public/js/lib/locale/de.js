//! moment.js locale configuration
//! locale : German [de]
//! author : lluchs : https://github.com/lluchs
//! author: Menelion Elensúle: https://github.com/Oire
//! author : Mikolaj Dadela : https://github.com/mik01aj

;(function (global, factory) {
   typeof exports === 'object' && typeof module !== 'undefined'
       && typeof require === 'function' ? factory(require('../moment')) :
   typeof define === 'function' && define.amd ? define(['../moment'], factory) :
   factory(global.moment)
}(this, (function (moment) { 'use strict';


function processRelativeTime(number, withoutSuffix, key, isFuture) {
    var format = {
        'm': ['eine Minute', 'einer Minute'],
        'h': ['eine Stunde', 'einer Stunde'],
        'd': ['ein Tag', 'einem Tag'],
        'dd': [number + ' Tage', number + ' Tagen'],
        'M': ['ein Monat', 'einem Monat'],
        'MM': [number + ' Monate', number + ' Monaten'],
        'y': ['ein Jahr', 'einem Jahr'],
        'yy': [number + ' Jahre', number + ' Jahren']
    };
    return withoutSuffix ? format[key][0] : format[key][1];
}

var de = moment.defineLocale('de', {
    months : 'Januar_Februar_März_April_Mai_Juni_Juli_August_September_Oktober_November_Dezember'.split('_'),
    monthsShort : 'Jan._Febr._Mrz._Apr._Mai_Jun._Jul._Aug._Sept._Okt._Nov._Dez.'.split('_'),
    monthsParseExact : true,
    weekdays : 'Sonntag_Montag_Dienstag_Mittwoch_Donnerstag_Freitag_Samstag'.split('_'),
    weekdaysShort : 'So._Mo._Di._Mi._Do._Fr._Sa.'.split('_'),
    weekdaysMin : 'So_Mo_Di_Mi_Do_Fr_Sa'.split('_'),
    weekdaysParseExact : true,
    longDateFormat : {
        LT: 'HH:mm',
        LTS: 'HH:mm:ss',
        L : 'DD.MM.YYYY',
        LL : 'D. MMMM YYYY',
        LLL : 'D. MMMM YYYY HH:mm',
        LLLL : 'dddd, D. MMMM YYYY HH:mm'
    },
    calendar : {
        sameDay: '[heute um] LT [Uhr]',
        sameElse: 'L',
        nextDay: '[morgen um] LT [Uhr]',
        nextWeek: 'dddd [um] LT [Uhr]',
        lastDay: '[gestern um] LT [Uhr]',
        lastWeek: '[letzten] dddd [um] LT [Uhr]'
    },
    relativeTime : {
        future : 'in %s',
        past : 'vor %s',
        s : 'ein paar Sekunden',
        m : processRelativeTime,
        mm : '%d Minuten',
        h : processRelativeTime,
        hh : '%d Stunden',
        d : processRelativeTime,
        dd : processRelativeTime,
        M : processRelativeTime,
        MM : processRelativeTime,
        y : processRelativeTime,
        yy : processRelativeTime
    },
    dayOfMonthOrdinalParse: /\d{1,2}\./,
    ordinal : '%d.',
    week : {
        dow : 1, // Monday is the first day of the week.
        doy : 4  // The week that contains Jan 4th is the first week of the year.
    }
});

return de;

})));

// Zahlenformate, siehe https://stackoverflow.com/a/23410204 und https://cdnjs.com/libraries/angular-i18n/
angular.module("ngLocale",[],["$provide",function(e){var r="one",a="other";e.value("$locale",{DATETIME_FORMATS:{AMPMS:["vorm.","nachm."],DAY:["Sonntag","Montag","Dienstag","Mittwoch","Donnerstag","Freitag","Samstag"],ERANAMES:["v. Chr.","n. Chr."],ERAS:["v. Chr.","n. Chr."],FIRSTDAYOFWEEK:0,MONTH:["Januar","Februar","März","April","Mai","Juni","Juli","August","September","Oktober","November","Dezember"],SHORTDAY:["So.","Mo.","Di.","Mi.","Do.","Fr.","Sa."],SHORTMONTH:["Jan.","Feb.","März","Apr.","Mai","Juni","Juli","Aug.","Sep.","Okt.","Nov.","Dez."],STANDALONEMONTH:["Januar","Februar","März","April","Mai","Juni","Juli","August","September","Oktober","November","Dezember"],WEEKENDRANGE:[5,6],fullDate:"EEEE, d. MMMM y",longDate:"d. MMMM y",medium:"dd.MM.y HH:mm:ss",mediumDate:"dd.MM.y",mediumTime:"HH:mm:ss",short:"dd.MM.yy HH:mm",shortDate:"dd.MM.yy",shortTime:"HH:mm"},NUMBER_FORMATS:{CURRENCY_SYM:"€",DECIMAL_SEP:",",GROUP_SEP:".",PATTERNS:[{gSize:3,lgSize:3,maxFrac:3,minFrac:0,minInt:1,negPre:"-",negSuf:"",posPre:"",posSuf:""},{gSize:3,lgSize:3,maxFrac:2,minFrac:2,minInt:1,negPre:"-",negSuf:" ¤",posPre:"",posSuf:" ¤"}]},id:"de-de",localeID:"de_DE",pluralCat:function(e,n){var M=0|e,i=function(e,r){var a=r;void 0===a&&(a=Math.min(function(e){var r=(e+="").indexOf(".");return-1==r?0:e.length-r-1}(e),3));var n=Math.pow(10,a);return{v:a,f:(e*n|0)%n}}(e,n);return 1==M&&0==i.v?r:a}})}]);