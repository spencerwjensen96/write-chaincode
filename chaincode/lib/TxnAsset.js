/*
 * Copyright IBM Corp. All Rights Reserved.
 *
 * SPDX-License-Identifier: Apache-2.0
 */

'use strict';

// Deterministic JSON.stringify()
const stringify  = require('json-stringify-deterministic');
const sortKeysRecursive  = require('sort-keys-recursive');
const { Contract } = require('fabric-contract-api');
//const shim = require('fabric-shim');

class TxnAsset extends Contract {

    async InitLedger(ctx) {
        const date = ctx.stub.getDateTimestamp();
        //console.log(date.toString());
        const assets = [
            {
                ID: 'asset1',
                Name: 'MyCampaign',
                Seller: 'Ad Space Seller',
                Buyer: 'Ad Space Buyer',
                TotalBudget: 1000,
                Budget: 1000,
                ClickPrice: 0.01,
                ClickCount: 0,
                ImpressionPrice: 0.0001,
                ImpressionCount: 0,
                PurchaseCount: 0,
                PurchaseAmount: 0,
                CreatedOnDate: date,
                LastUpdated: date,
                Status: 'ISSUED',
                LastTxn: {
                    Id: '',
                    Ip: '',
                    Domain: '',
                    Browser: '',
                    Device: '',
                    PageTime: '',
                    PagePosition: '',
                    TxnType: 'CREATE'
                }
            }
        ];

        for (const asset of assets) {
            asset.docType = 'asset';
            // example of how to write to world state deterministically
            // use convetion of alphabetic order
            // we insert data in alphabetic order using 'json-stringify-deterministic' and 'sort-keys-recursive'
            // when retrieving data, in any lang, the order of data will be the same and consequently also the corresonding hash
            await ctx.stub.putState(asset.ID, Buffer.from(stringify(sortKeysRecursive(asset))));
        }
    }

    // CreateAsset issues a new asset to the world state with given details.
    async CreateAsset(ctx, id, name, seller, buyer, budget, clickPrice, impressionPrice) {
        const exists = await this.AssetExists(ctx, id);
        if (exists) {
            throw new Error(`The asset ${id} already exists`);
        }
        const date = ctx.stub.getDateTimestamp();
        //date = date.toString();
        const asset = {
            ID: id,
            Name: name,
            Seller: seller,
            Buyer: buyer,
            TotalBudget: budget,
            Budget: budget,
            ClickPrice: clickPrice,
            ClickCount: 0,
            ImpressionPrice: impressionPrice,
            ImpressionCount: 0,
            PurchaseCount: 0,
            PurchaseAmount: 0,
            CreatedOnDate: date,
            LastUpdated: date,
            Status: 'ISSUED',
            LastTxn: {
                Id: '',
                Domain: '',
                Ip: '',
                Browser: '',
                Device: '',
                PageTime: '',
                PagePosition: '',
                TxnType: 'CREATE'
            }
        };
        //we insert data in alphabetic order using 'json-stringify-deterministic' and 'sort-keys-recursive'
        await ctx.stub.putState(id, Buffer.from(stringify(sortKeysRecursive(asset))));
        return JSON.stringify(asset);
    }

    // ReadAsset returns the asset stored in the world state with given id.
    async ReadAsset(ctx, id) {
        const assetJSON = await ctx.stub.getState(id); // get the asset from chaincode state
        if (!assetJSON || assetJSON.length === 0) {
            throw new Error(`The asset ${id} does not exist`);
        }
        return assetJSON.toString();
    }

    async UpdateAsset(ctx, id, name, seller, buyer, adjustBudget, clickPrice, impressionPrice, status) {
        const exists = await this.AssetExists(ctx, id);
        if (!exists) {
            throw new Error(`The asset ${id} does not exist`);
        }
        const assetString = await this.ReadAsset(ctx, id);
        const asset = JSON.parse(assetString);
        const date = ctx.stub.getDateTimestamp();

        // overwriting original asset with new asset
        const updatedAsset = {
            ID: asset.ID,
            Name: name,
            Seller: seller,
            Buyer: buyer,
            TotalBudget: (asset.TotalBudget + adjustBudget),
            Budget: (asset.Budget + adjustBudget),
            ClickPrice: clickPrice,
            ClickCount: asset.ClickCount,
            ImpressionPrice: impressionPrice,
            ImpressionCount: asset.ImpressionCount,
            PurchaseCount: asset.PurchaseCount,
            PurchaseAmount: asset.PurchaseAmount,
            CreatedOnDate: asset.CreatedOnDate,
            LastUpdated: date,
            Status: status,
            LastTxn: asset.LastTxn
        };
        // we insert data in alphabetic order using 'json-stringify-deterministic' and 'sort-keys-recursive'
        await ctx.stub.putState(id, Buffer.from(stringify(sortKeysRecursive(updatedAsset))));
        return JSON.stringify(updatedAsset);
    }

    // DeleteAsset deletes an given asset from the world state.
    async DeleteAsset(ctx, id) {
        const exists = await this.AssetExists(ctx, id);
        if (!exists) {
            throw new Error(`The asset ${id} does not exist`);
        }
        return ctx.stub.deleteState(id);
    }

    async EndCampaign(ctx, id) {
        const exists = await this.AssetExists(ctx, id);
        if (!exists) {
            throw new Error(`The asset ${id} does not exist`);
        }
        const date = ctx.stub.getDateTimestamp();
        let assetString = await this.ReadAsset(ctx, id);
        let asset = JSON.parse(assetString);
        asset.Budget = 0;
        asset.Status = 'FINISHED';
        asset.LastUpdated = date;
        return ctx.stub.putState(id, Buffer.from(stringify(sortKeysRecursive(asset))));
    }

    async PauseCampaign(ctx, id) {
        const exists = await this.AssetExists(ctx, id);
        if (!exists) {
            throw new Error(`The asset ${id} does not exist`);
        }
        const date = ctx.stub.getDateTimestamp();
        let assetString = await this.ReadAsset(ctx, id);
        let asset = JSON.parse(assetString);
        if(asset.Status === 'PAUSED'){
            asset.Status = 'ACTIVE';
            asset.LastUpdated = date;
            return ctx.stub.putState(id, Buffer.from(stringify(sortKeysRecursive(asset))));
        }
        else {
            asset.Status = 'PAUSED';
            asset.LastUpdated = date;
            return ctx.stub.putState(id, Buffer.from(stringify(sortKeysRecursive(asset))));
        }
    }

    // AssetExists returns true when asset with given ID exists in world state.
    async AssetExists(ctx, id) {
        const assetJSON = await ctx.stub.getState(id);
        return assetJSON && assetJSON.length > 0;
    }

    // Txn Update given the id and transaction type
    async TxnAsset(ctx, id, txnType, ip, domain, browser, device, page_time, page_position) {
        const exists = await this.AssetExists(ctx, id);
        if (!exists) {
            throw new Error(`The asset ${id} does not exist`);
        }
        // overwriting original asset with new asset
        const date = ctx.stub.getDateTimestamp();
        let assetString = await this.ReadAsset(ctx, id);
        let asset = JSON.parse(assetString);
        let txnPrice = 0.0;
        txnType === 'CLICK' ? txnPrice = asset.ClickPrice : txnPrice = asset.ImpressionPrice;
        //Activate Campaign
        if(asset.Status === 'ISSUED'){
            asset = JSON.parse(await this.UpdateAsset(ctx, id, asset.Name, asset.Seller, asset.Buyer, 0, asset.ClickPrice, asset.ImpressionPrice, 'ACTIVE'));
        }
        //Active Campaign
        if(asset.Status === 'ACTIVE' && asset.Budget >= txnPrice){
            asset.Budget -= txnPrice;
            if(txnType === 'CLICK'){
                asset.ClickCount += 1;
            }
            else{
                asset.ImpressionCount += 1;
            }
        }
        //Last Transasction
        else if(asset.Budget < txnPrice){
            if(txnType === 'CLICK'){
                asset.ClickCount += 1;
            }
            else{
                asset.ImpressionCount += 1;
            }
            asset.Budget = 0;
            asset.Status = 'FINISHED';
        }
        asset.LastTxn.Id = ctx.stub.getTxID();
        asset.LastTxn.Ip = ip;
        asset.LastTxn.Domain = domain;
        asset.LastTxn.Browser = browser;
        asset.LastTxn.Device = device;
        asset.LastTxn.PageTime = page_time;
        asset.LastTxn.PagePosition = page_position;
        asset.LastTxn.TxnType = txnType;
        asset.LastUpdated = date;
        
        // we insert data in alphabetic order using 'json-stringify-deterministic' and 'sort-keys-recursive'
        return ctx.stub.putState(id, Buffer.from(stringify(sortKeysRecursive(asset))));
    }

    async SubmitPurchase(ctx,id, amount){
        const exists = await this.AssetExists(ctx, id);
        if (!exists) {
            throw new Error(`The asset ${id} does not exist`);
        }
        const date = ctx.stub.getDateTimestamp();
        let assetString = await this.ReadAsset(ctx, id);
        let asset = JSON.parse(assetString);
        asset.PurchaseCount += 1;
        asset.PurchaseAmount += parseInt(amount);
        asset.LastUpdated = date;
        return ctx.stub.putState(id, Buffer.from(stringify(sortKeysRecursive(asset))));
    }

    // GetAllAssets returns all assets found in the world state.
    async GetAllAssets(ctx) {
        const allResults = [];
        // range query with empty string for startKey and endKey does an open-ended query of all assets in the chaincode namespace.
        const iterator = await ctx.stub.getStateByRange('', '');
        let result = await iterator.next();
        while (!result.done) {
            const strValue = Buffer.from(result.value.value.toString()).toString('utf8');
            let record;
            try {
                record = JSON.parse(strValue);
            } catch (err) {
                console.log(err);
                record = strValue;
            }
            allResults.push(record);
            result = await iterator.next();
        }
        return JSON.stringify(allResults);
    }

    async GetBlockByNumber(ctx, channel, number) {
        return 1;
    }

    async retrieveHistory(ctx, key) {
        console.info('getting history for key: ' + key);
        let iterator = await ctx.stub.getHistoryForKey(key);
        let result = [];
        let res = await iterator.next();
        while (!res.done) {
          if (res.value) {
            console.info(`found state update with value: ${res.value.value.toString('utf8')}`);
            const obj = JSON.parse(res.value.value.toString('utf8'));
            result.push(obj);
          }
          res = await iterator.next();
        }
        await iterator.close();
        return result;
      }
}

module.exports = TxnAsset;
