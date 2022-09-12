/**
 * Receives a query object as parameter and sends it as Ajax request to the POST /query REST endpoint.
 *
 * @param query The query object
 * @returns {Promise} Promise that must be fulfilled if the Ajax request is successful and be rejected otherwise.
 */
// import Constants from "../../src/rest/Constants";

CampusExplorer.sendQuery = (query) => {
    return new Promise((resolve, reject) => {
        let xmlhttp = new XMLHttpRequest();

        xmlhttp.open("POST", "http://localhost:4321/query", true);
        xmlhttp.setRequestHeader("Content-Type", "application/json");
        console.log(`sending query: ${JSON.stringify(query)}`);
        xmlhttp.send(JSON.stringify(query));

        xmlhttp.onload = function() {
            resolve(JSON.parse(xmlhttp.response));
        };

        xmlhttp.onerror =  function () {
            return Promise.reject();
        }
    });
};
