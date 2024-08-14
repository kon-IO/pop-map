const prefix = "koindata";
const data = await Bun.file(`./${prefix}.json`).json()
const index = await Bun.file(`./${prefix}-index.json`).json()
const out = [];
data.forEach(obj => {
    const arr = [];
    Object.entries(obj).forEach(([key, val]) => {
        console.log(key, val, index[key])
        arr[index[key]] = val;
    })
    out.push(arr);
});
await Bun.write(`./${prefix}-array.json`, JSON.stringify(out));