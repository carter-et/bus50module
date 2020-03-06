
Module.register("busschedule" , {

    // Define defaults
    defaults: {
        updateInterval: 60 * 1000,
        animationSpeed: 2000,
        fade: true,
        fadePoint: 0.25,
        initialLoadDelay: 0,

        //url = f"https://www.ridetherapid.org/api/routes/routeStopInfo
        // ?routeNumber={bus_id}
        // &direction={direction}
        // &stopID={stop_id}
        // &manualStopID="
        apiBase: 'https://www.ridetherapid.org/api/routes/routeStopInfo',

        route: 50,
        direction: 'Westbound',
        stopID: 4882
    },

    getStyles: function() {
        return["bus.css", "font-awesome.css"];
    },

    getScripts: function() {
        return[moment.js];
    },

    //define start sequence
    start: function () {
        Log.info("Starting module: " + this.name);

        //set locale.
        moment.locate(config.language);

        this.buses = {};
        this.loaded = false;
        this.scheduleUpdate(this.config.initialLoadDelay);

        this.updateTimer = null;

        this.url = encodeURI(this.config.apiBase + this.getParams());

        this.updateBusInfo(this);
    },

    updateBusInfo: function(self) {
        if (this.hidden != true) {
            self.sendSocketNotification('GET)BUSINFO', {'url': self.url});
        }
    },

    getDom: function() {
        var wrapper = document.createElement("div");

        if (this.config.atcocode === "") {
            wrapper.innerHTML = "Please set the ATCO Code: " + this.atcocode + ".";
            wrapper.className = "dimmed light small";
            return wrapper;
        }

        if (this.config.app_id === "") {
            wrapper.innerHTML = "Please set the application ID: " + this.app_id + ".";
            wrapper.className = "dimmed light small";
            return wrapper;
        }

        if (this.config.app_key === "") {
            wrapper.innerHTML = "Please set the application key: " + this.app_key + ".";
            wrapper.className = "dimmed light small";
            return wrapper;
        }

        if (!this.loaded) {
            wrapper.innerHTML = "Loading bus Info ...";
            wrapper.className = "dimmed light small";
            return wrapper;
        }

        if (this.buses.stopName !== null) {
            this.config.header = this.buses.stopName;
        }

        //Dump bus data
        if (this.config.debug) {
            Log.info(this.buses);
        }

        // *** Start Building Table
        var bustable = document.createElement("table");
        bustable.className = "small";

        //If we have departure info
        if (this.buses.data.length > 0) {

            for (var t in this.buses.data) {
                var bus = this.buses.data[t];

                var row = document.createElement("tr");
                bustable.appendChild(row);

                //Route name/Number
                var routeCell = document.createElement("td");
                routeCell.className = "route";
                routeCell.innerHTML = " " + bus.routeName + " ";
                row.appendChild(routeCell);

                //Direction Info
                var directionCell = document.createElement("td");
                directionCell.className = "dest";
                directionCell.innerHTML = bus.direction;
                row.appendChild(directionCell);

                //Time Tabled Departure
                var timeTabledCell = document.createElement("td");
                timeTabledCell.innerHTML = bus.timetableDeparture;
                timeTabledCell.className = "timeTabled";
                row.appendChild(timeTabledCell);

                if (this.config.showRealTime) {
                    //Real Time Feedback for Departure
                    var realTimeCell = document.createElement("td");
                    realTimeCell.innerHTML = "(" + bus.expectedDeparture + ")";
                    realTimeCell.className = "expTime";
                    row.appendChild(realTimeCell);
                }

                if (this.config.showDelay) {
                    //Delay Departure
                    var delayCell = document.createElement("td");

                    if (bus.delay > 1 || bus.delay < -1) {
                        label = " mins ";
                    } else {
                        label = " min ";
                    }

                    if (bus.delay < 0) {
                        delayCell.innerHTML = Math.abs(bus.delay) + label + "late";
                        delayCell.className = "late";
                    } else if (bus.delay > 0) {
                        delayCell.innerHTML = Math.abs(bus.delay) + label + "early";
                        delayCell.className = "early";
                    } else {
                        if (this.config.nextBuses.toLowerCase() === "yes") {
                            delayCell.innerHTML = " On Time ";
                            delayCell.className = "nonews";
                        } else {
                            delayCell.innerHTML = " Scheduled";
                            delayCell.className = "nonews";
                        }
                    }

                    row.appendChild(delayCell);
                }

                if (this.config.fade && this.config.fadePoint < 1) {
                    if (this.config.fadePoint < 0) {
                        this.config.fadePoint = 0;
                    }
                    var startingPoint = this.buses.length * this.config.fadePoint;
                    var steps = this.buses.length - startingPoint;
                    if (t >= startingPoint) {
                        var currentStep = t - startingPoint;
                        row.style.opacity = 1 - (1 / steps * currentStep);
                    }
                }

            }
        } else {
            var row1 = document.createElement("tr");
            bustable.appendChild(row1);

            var messageCell = document.createElement("td");
            messageCell.innerHTML = " " + this.buses.message + " ";
            messageCell.className = "bright";
            row1.appendChild(messageCell);

            var row2 = document.createElement("tr");
            bustable.appendChild(row2);

            var timeCell = document.createElement("td");
            timeCell.innerHTML = " " + this.buses.timestamp + " ";
            timeCell.className = "bright";
            row2.appendChild(timeCell);

        }

        wrapper.appendChild(bustable);
        // *** End building results table

        return wrapper;

    },

    processBuses: function(data) {
        //Define object to hold bus data
        this.buses = {};
        //Define array of departure info
        this.buses.data = [];
        //Define timestamp of current data
        this.buses.timestamp = new Date();
        //Define message holder
        this.buses.message = null;

        //Check we have data back from API
        if (typeof data !== 'undefined' && data !== null) {

            //Figure out Bus Stop Name
            //Define empty stop name
            var stopName = "";

            if (typeof data.name !== 'undefined' && data.name !== null) {
                //Populate with stop name returned by TransportAPI info - Stop name & indicator combined
                stopName = data.name;

                //If requested, append the bearing as well - assuming it is there!
                if((this.config.showBearing) && (typeof data.bearing !== 'undefined' && data.bearing !== null)) {
                    stopName = stopName + " (" + data.bearing + ")";
                }

            } else if (typeof data.stop_name !== 'undefined' && data.stop_name !== null) {
                //Populate with stop name and bearing returned by TransportAPI info
                stopName = data.stop_name + " (" + data.bearing + ")";
            } else {
                //Default
                stopName = "Departures";
            }
            //Set value
            this.buses.stopName = stopName;

            //Check we have route info
            if (typeof data.departures !== 'undefined' && data.departures !== null) {

                //... and some departures
                if (typeof data.departures.all !== 'undefined' && data.departures.all !== null) {

                    if (data.departures.all.length > 0) {
                        //Figure out how long the results are
                        var counter = data.departures.all.length;

                        //See if there are more results than requested and limit if necessary
                        if (counter > this.config.limit) {
                            counter = this.config.limit;
                        }

                        //Loop over the results up to the max - either counter of returned
                        for (var i = 0; i < counter; i++) {

                            var bus = data.departures.all[i];
                            var delay = null;

                            var thisDate;
                            var thisTimetableTime;
                            var thisLiveTime;

                            if (this.config.nextBuses.toLowerCase() === "yes") {
                                //NextBuses Is On, so we need to use best & expected values - assuming they're present!
                                //Date
                                if(bus.expected_departure_date !== null){
                                    thisDate = bus.expected_departure_date;
                                } else {
                                    Log.error('NextBus info is missing - falling back to timetabled info');
                                    thisDate = bus.date;
                                }
                                //timetabled time
                                thisTimetableTime = bus.best_departure_estimate;
                                //live time
                                if (bus.expected_departure_time !== null) {
                                    thisLiveTime = bus.expected_departure_time;
                                } else {
                                    thisLiveTime = bus.best_departure_estimate;
                                }

                            } else {
                                //NextBuses Is Off, so we need to use aimed & expected values
                                //Date
                                thisDate = bus.date;
                                //timetabled time
                                if (bus.aimed_departure_time !== null) {
                                    thisTimetableTime = bus.aimed_departure_time;
                                } else {
                                    thisTimetableTime = bus.expected_departure_time;
                                }
                                //live time
                                thisLiveTime = bus.best_departure_estimate;
                            }

                            if (this.config.debug) {
                                Log.warn('===================================');
                                Log.warn(this.config.nextBuses.toLowerCase());
                                Log.warn(this.config.showDelay);
                                Log.warn(bus);
                                Log.warn(thisDate);
                                Log.warn(thisTimetableTime);
                                Log.warn(thisLiveTime);
                                Log.warn('^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^');
                            }

                            //Only do these calc if showDelay is set in the config
                            if (this.config.showDelay) {
                                var arrRTDate = thisDate.split('-');
                                var arrRTTime = thisLiveTime.split(':');

                                var arrTTDate = thisDate.split('-');
                                var arrTTTime = thisTimetableTime.split(':');

                                var RTDate = new Date(arrRTDate[0], arrRTDate[1], arrRTDate[2], arrRTTime[0], arrRTTime[1]);
                                var TTDate = new Date(arrTTDate[0], arrTTDate[1], arrTTDate[2], arrTTTime[0], arrTTTime[1]);

                                delay = (((TTDate - RTDate) / 1000) / 60);
                            }

                            //Only push the info if the delay isn't excessive
                            if (delay > this.config.maxDelay) {
                                this.buses.data.push({
                                    routeName: bus.line_name,
                                    direction: bus.direction,
                                    timetableDeparture: thisTimetableTime,
                                    expectedDeparture: thisLiveTime,
                                    delay: delay
                                });
                            }
                        }
                    } else {
                        //No departures structure - set error message
                        this.buses.message = "No departure info returned";
                        if (this.config.debug) {
                            console.error("=======LEVEL 4=========");
                            console.error(this.buses);
                            console.error("^^^^^^^^^^^^^^^^^^^^^^^");
                        }
                    }
                } else {
                    //No departures returned - set error message
                    this.buses.message = "No departures scheduled";
                    if (this.config.debug) {
                        Log.error("=======LEVEL 3=========");
                        Log.error(this.buses);
                        Log.error("^^^^^^^^^^^^^^^^^^^^^^^");
                    }
                }
            } else {
                //No info returned - set error message
                this.buses.message = "No info about the stop returned";
                if (this.config.debug) {
                    Log.error("=======LEVEL 2=========");
                    Log.error(this.buses);
                    Log.error("^^^^^^^^^^^^^^^^^^^^^^^");
                }
            }
        } else {
            //No data returned - set error message
            this.buses.message = "No data returned";
            if (this.config.debug) {
                Log.error("=======LEVEL 1=========");
                Log.error(this.buses);
                Log.error("^^^^^^^^^^^^^^^^^^^^^^^");
            }
        }

        this.loaded = true;

        this.updateDom(this.config.animationSpeed);
    },


    /* getParams()
     * Generates an url with api parameters based on the config.
     * return String - URL params.
     */
    getParams: function() {
        var params = "?";
        params += "&route=" + this.config.route;
        params += "&direction=" + this.config.direction;
        params += "&stopID=" + this.config.stopID;
        params += "&manualStopId=";

        //Log.info(params);
        return params;
    },

    /* scheduleUpdate()
     * Schedule next update.
     * argument delay number - Milliseconds before next update. If empty, this.config.updateInterval is used.
     */
    scheduleUpdate: function(delay) {
        var nextLoad = this.config.updateInterval;
        if (typeof delay !== "undefined" && delay >= 0) {
            nextLoad = delay;
        }

        var self = this;
        clearTimeout(this.updateTimer);
        this.updateTimer = setTimeout(function() {
            self.updateBusInfo(self);
        }, nextLoad);
    },


    // Process data returned
    socketNotificationReceived: function(notification, payload) {

        if (notification === 'BUS_DATA' && payload.url === this.url) {
            this.processBuses(payload.data);
            this.scheduleUpdate(this.config.updateInterval);
        }
    }

});