const axios = require('axios');
const fs = require('fs')

function delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}
function getData() {
    return axios.get("https://pokeapi.co/api/v2/gender")
        .then(
            function (res, err) {
                if (!err) {
                    return res?.data?.results;
                }
            }
        ).then(
            function (res, err) {
                let funcs = []
                if (!err) {
                    for (let i = 0; i < res.length; i++) {
                        funcs.push(
                            new Promise((resolve, reject) => {
                                axios.get(res[i].url).then(res => resolve(res.data)).catch(err => reject(err))
                            })
                        );
                    }
                }
                return funcs;
            }).then(function (res, err) {
                let data = []
                Promise.all(res).then(
                    resolves => {
                        resolves.forEach(gender => {
                            gender?.pokemon_species_details.forEach(pk => {
                                data.push({
                                    "name": pk?.pokemon_species?.name,
                                    "url": pk?.pokemon_species?.url
                                });
                            });
                        });
                        return data;
                    }
                ).then(res => {
                    console.log(`Getting data of ${res.length.toString()} Pokemons`);
                    const batchSize = 10;
                    let resultsList = []
                    let batchPromises = []
                    const delayTime = 3000;
                    for (let i = 0; i < res.length; i += batchSize) {
                        const batch = res.slice(i, i + batchSize).map(url => axios.get(url.url, {timeout:10000}).then(q => q.data));
                        const batchPromise = Promise.allSettled(batch)
                            .then(results => {
                                results.forEach((result, index) => {
                                    if (result.status === "fulfilled") {
                                        console.log(`Batch ${Math.floor(i / batchSize)} Call ${index}`);
                                        resultsList.push(result.value);
                                    } else {
                                        console.error(`Batch ${Math.floor(i / batchSize)} Call ${index} failed with reason:`, result.reason);
                                    }
                                });
                            })
                            .then(() => delay(delayTime));

                        batchPromises.push(batchPromise);
                    }

                    batchPromises.reduce((p, next) => p.then(() => next), Promise.resolve())
                        .then(() => {
                            console.log('All API calls are complete.');
                            console.log('Results list:', resultsList.length);
                            //return resultsList; // Return the results list
                            const jsonString = JSON.stringify(resultsList, null, 2);

                            fs.writeFile('./results.json', jsonString, err => {
                                if (err) {
                                    console.error('Error writing file:', err);
                                } else {
                                    console.log('File has been written successfully.');
                                }
                            });
                        });


                })
            })
}

getData();





