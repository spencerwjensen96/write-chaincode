'use strict';
const sinon = require('sinon');
const chai = require('chai');
const sinonChai = require('sinon-chai');
const expect = chai.expect;

const { Context } = require('fabric-contract-api');
const { ChaincodeStub } = require('fabric-shim');

const TxnAsset = require('../lib/TxnAsset.js');

let assert = sinon.assert;
chai.use(sinonChai);

describe('Asset Transfer Basic Tests', () => {
    let transactionContext, chaincodeStub, asset;
    beforeEach(() => {
        transactionContext = new Context();

        chaincodeStub = sinon.createStubInstance(ChaincodeStub);
        transactionContext.setChaincodeStub(chaincodeStub);

        chaincodeStub.putState.callsFake((key, value) => {
            if (!chaincodeStub.states) {
                chaincodeStub.states = {};
            }
            chaincodeStub.states[key] = value;
        });

        chaincodeStub.getState.callsFake(async (key) => {
            let ret;
            if (chaincodeStub.states) {
                ret = chaincodeStub.states[key];
            }
            return Promise.resolve(ret);
        });

        chaincodeStub.deleteState.callsFake(async (key) => {
            if (chaincodeStub.states) {
                delete chaincodeStub.states[key];
            }
            return Promise.resolve(key);
        });

        chaincodeStub.getStateByRange.callsFake(async () => {
            function* internalGetStateByRange() {
                if (chaincodeStub.states) {
                    // Shallow copy
                    const copied = Object.assign({}, chaincodeStub.states);
                    for (let key in copied) {
                        yield {value: copied[key]};
                    }
                }
            }

            return Promise.resolve(internalGetStateByRange());
        });
        //var date = transactionContext.stub.getDateTimestamp();
        asset = {
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
            //CreateOnDate: chaincodeStub.getTxTimestamp(),
            Status: 'ISSUED'
        };
    });

    describe('Test InitLedger', () => {
        it('should return error on InitLedger', async () => {
            chaincodeStub.putState.rejects('failed inserting key');
            let txnAsset = new TxnAsset();
            try {
                await txnAsset.InitLedger(transactionContext);
                assert.fail('InitLedger should have failed');
            } catch (err) {
                expect(err.name).to.equal('failed inserting key');
            }
        });

        it('should return success on InitLedger', async () => {
            let txnAsset = new TxnAsset();
            await txnAsset.InitLedger(transactionContext);
            let ret = JSON.parse((await chaincodeStub.getState('asset1')).toString());
            expect(ret.ID).to.eql('asset1');
        });
    });

    describe('Test CreateAsset', () => {
        it('should return error on CreateAsset', async () => {
            chaincodeStub.putState.rejects('failed inserting key');

            let txnAsset = new TxnAsset();
            try {
                await txnAsset.CreateAsset(transactionContext, asset.ID, asset.Name, asset.Seller, asset.Buyer, asset.Budget, asset.ClickPrice, asset.ImpressionPrice);
                assert.fail('CreateAsset should have failed');
            } catch(err) {
                expect(err.name).to.equal('failed inserting key');
            }
        });

        it('should return success on CreateAsset', async () => {
            let txnAsset = new TxnAsset();

            await txnAsset.CreateAsset(transactionContext, asset.ID, asset.Name, asset.Seller, asset.Buyer, asset.Budget, asset.ClickPrice, asset.ImpressionPrice);

            let ret = JSON.parse((await chaincodeStub.getState(asset.ID)).toString());
            expect(ret.ID).to.eql(asset.ID);
        });
    });

    describe('Test ReadAsset', () => {
        it('should return error on ReadAsset', async () => {
            let txnAsset = new TxnAsset();
            await txnAsset.CreateAsset(transactionContext, asset.ID, asset.Name, asset.Seller, asset.Buyer, asset.Budget, asset.ClickPrice, asset.ImpressionPrice);

            try {
                await txnAsset.ReadAsset(transactionContext, 'asset2');
                assert.fail('ReadAsset should have failed');
            } catch (err) {
                expect(err.message).to.equal('The asset asset2 does not exist');
            }
        });

        it('should return success on ReadAsset', async () => {
            let txnAsset = new TxnAsset();
            await txnAsset.CreateAsset(transactionContext, asset.ID, asset.Name, asset.Seller, asset.Buyer, asset.Budget, asset.ClickPrice, asset.ImpressionPrice);

            let ret = JSON.parse(await chaincodeStub.getState(asset.ID));
            expect(ret.ID).to.eql(asset.ID);
        });
    });

    describe('Test UpdateAsset', () => {
        it('should return error on UpdateAsset', async () => {
            let txnAsset = new TxnAsset();
            await txnAsset.CreateAsset(transactionContext, asset.ID, asset.Name, asset.Seller, asset.Buyer, asset.Budget, asset.ClickPrice, asset.ImpressionPrice);

            try {
                await txnAsset.UpdateAsset(transactionContext, 'asset2', 'Name1', 'Name2', 'Seller', 'Buyer', 100, 0.01, 0.001);
                assert.fail('UpdateAsset should have failed');
            } catch (err) {
                expect(err.message).to.equal('The asset asset2 does not exist');
            }
        });

        it('should return success on UpdateAsset', async () => {
            let txnAsset = new TxnAsset();
            await txnAsset.CreateAsset(transactionContext, asset.ID, asset.Name, asset.Seller, asset.Buyer, asset.Budget, asset.ClickPrice, asset.ImpressionPrice);

            await txnAsset.UpdateAsset(transactionContext, 'asset1', 'Campaign', 'Seller', 'Buyer', 100, 0.01, 0.001);
            let ret = JSON.parse(await chaincodeStub.getState(asset.ID));
            let expected = {
                ID: 'asset1',
                Name: 'Campaign',
                Seller: 'Seller',
                Buyer: 'Buyer',
                TotalBudget: 1100,
                Budget: 1100,
                ClickPrice: 0.01,
                ClickCount: 0,
                ImpressionPrice: 0.001,
                ImpressionCount: 0,
                PurchaseCount: 0,
                Status: 'ACTIVE'
            };
            expect(ret.ID).to.eql(expected.ID);
        });

        it('should update status to "ACTIVE" on UpdateAsset from "ISSUED"', async () => {
            let txnAsset = new TxnAsset();
            await txnAsset.CreateAsset(transactionContext, asset.ID, asset.Name, asset.Seller, asset.Buyer, asset.Budget, asset.ClickPrice, asset.ImpressionPrice);

            await txnAsset.UpdateAsset(transactionContext, 'asset1', 'Campaign', 'Seller', 'Buyer', 100, 0.01, 0.001, 'ACTIVE');
            let ret = JSON.parse(await chaincodeStub.getState(asset.ID));
            let expected = {
                ID: 'asset1',
                Name: 'Campaign',
                Seller: 'Seller',
                Buyer: 'Buyer',
                TotalBudget: 1100,
                Budget: 1100,
                ClickPrice: 0.01,
                ClickCount: 0,
                ImpressionPrice: 0.001,
                ImpressionCount: 0,
                PurchaseCount: 0,
                Status: 'ACTIVE',
                LastTxn: {
                    Ip: '',
                    Browser: '',
                    Device: '',
                    PageTime: '',
                }
            };
            expect(ret).to.eql(expected);
        });

    });

    describe('Test DeleteAsset', () => {
        it('should return error on DeleteAsset', async () => {
            let txnAsset = new TxnAsset();
            await txnAsset.CreateAsset(transactionContext, asset.ID, asset.Name, asset.Seller, asset.Buyer, asset.Budget, asset.ClickPrice, asset.ImpressionPrice);

            try {
                await txnAsset.DeleteAsset(transactionContext, 'asset2');
                assert.fail('DeleteAsset should have failed');
            } catch (err) {
                expect(err.message).to.equal('The asset asset2 does not exist');
            }
        });

        it('should return success on DeleteAsset', async () => {
            let txnAsset = new TxnAsset();
            await txnAsset.CreateAsset(transactionContext, asset.ID, asset.Name, asset.Seller, asset.Buyer, asset.Budget, asset.ClickPrice, asset.ImpressionPrice);

            await txnAsset.DeleteAsset(transactionContext, asset.ID);
            let ret = await chaincodeStub.getState(asset.ID);
            expect(ret).to.equal(undefined);
        });
    });

    describe('Test EndCampaign', () => {
        it('should return error on EndCampaign', async () => {
            let txnAsset = new TxnAsset();
            await txnAsset.CreateAsset(transactionContext, asset.ID, asset.Name, asset.Seller, asset.Buyer, asset.Budget, asset.ClickPrice, asset.ImpressionPrice);

            try {
                await txnAsset.EndCampaign(transactionContext, 'asset2');
                assert.fail('EndCampaign should have failed');
            } catch (err) {
                expect(err.message).to.equal('The asset asset2 does not exist');
            }
        });

        it('should end the campaign with a FINISHED status and 0 Budget', async () => {
            let txnAsset = new TxnAsset();
            await txnAsset.CreateAsset(transactionContext, asset.ID, asset.Name, asset.Seller, asset.Buyer, asset.Budget, asset.ClickPrice, asset.ImpressionPrice);

            await txnAsset.EndCampaign(transactionContext, 'asset1');
            let ret = JSON.parse(await chaincodeStub.getState(asset.ID));
            let expected = {
                ID: asset.ID,
                Name: asset.Name,
                Seller: asset.Seller,
                Buyer: asset.Buyer,
                TotalBudget: asset.TotalBudget,
                Budget: 0,
                ClickPrice: asset.ClickPrice,
                ClickCount: asset.ClickCount,
                ImpressionPrice: asset.ImpressionPrice,
                ImpressionCount: asset.ImpressionCount,
                PurchaseCount: asset.PurchaseCount,
                Status: 'FINISHED',
                LastTxn: {
                    Ip: '',
                    Browser: '',
                    Device: '',
                    PageTime: '',
                }
            };
            expect(ret).to.eql(expected);
        });
    });

    describe('Test SubmitPurchase', () => {
        it('should return error on SubmitPurchase', async () => {
            let txnAsset = new TxnAsset();
            await txnAsset.CreateAsset(transactionContext, asset.ID, asset.Name, asset.Seller, asset.Buyer, asset.Budget, asset.ClickPrice, asset.ImpressionPrice);

            try {
                await txnAsset.TxnAsset(transactionContext, 'asset2', 'CLICK');
                assert.fail('SubmitPurchase should have failed');
            } catch (err) {
                expect(err.message).to.equal('The asset asset2 does not exist');
            }
        });

        it('should return success on SubmitPurchase with the right PurchaseCount', async () => {
            let txnAsset = new TxnAsset();
            await txnAsset.CreateAsset(transactionContext, asset.ID, asset.Name, asset.Seller, asset.Buyer, asset.Budget, asset.ClickPrice, asset.ImpressionPrice);
            await txnAsset.TxnAsset(transactionContext, asset.ID, 'CLICK', '127.0.0.1', 'chrome', 'MacOS', '123');
            await txnAsset.SubmitPurchase(transactionContext, asset.ID);
            let ret = JSON.parse((await chaincodeStub.getState(asset.ID)).toString());
            let expected = {
                ID: 'asset1',
                Name: 'MyCampaign',
                Seller: 'Ad Space Seller',
                Buyer: 'Ad Space Buyer',
                TotalBudget: 1000,
                Budget: 999.99,
                ClickPrice: 0.01,
                ClickCount: 1,
                ImpressionPrice: 0.0001,
                ImpressionCount: 0,
                PurchaseCount: 1,
                Status: 'ACTIVE',
                LastTxn: {
                    Ip: '127.0.0.1',
                    Browser: 'chrome',
                    Device: 'MacOS',
                    PageTime: '123',
                }
            };
            expect(ret).to.eql(expected);
        });
    });

    describe('Test TxnAsset', () => {
        it('should return error on TxnAsset', async () => {
            let txnAsset = new TxnAsset();
            await txnAsset.CreateAsset(transactionContext, asset.ID, asset.Name, asset.Seller, asset.Buyer, asset.Budget, asset.ClickPrice, asset.ImpressionPrice);

            try {
                await txnAsset.TxnAsset(transactionContext, 'asset2', 'CLICK');
                assert.fail('TxnAsset should have failed');
            } catch (err) {
                expect(err.message).to.equal('The asset asset2 does not exist');
            }
        });

        it('should return success on TxnAsset with the right Budget and ClickCount', async () => {
            let txnAsset = new TxnAsset();
            await txnAsset.CreateAsset(transactionContext, asset.ID, asset.Name, asset.Seller, asset.Buyer, asset.Budget, asset.ClickPrice, asset.ImpressionPrice);

            await txnAsset.TxnAsset(transactionContext, asset.ID, 'CLICK', '127.0.0.1', 'chrome', 'MacOS', '123');
            let ret = JSON.parse((await chaincodeStub.getState(asset.ID)).toString());
            let expected = {
                ID: 'asset1',
                Name: 'MyCampaign',
                Seller: 'Ad Space Seller',
                Buyer: 'Ad Space Buyer',
                TotalBudget: 1000,
                Budget: 999.99,
                ClickPrice: 0.01,
                ClickCount: 1,
                ImpressionPrice: 0.0001,
                ImpressionCount: 0,
                PurchaseCount: 0,
                Status: 'ACTIVE',
                LastTxn: {
                    Ip: '127.0.0.1',
                    Browser: 'chrome',
                    Device: 'MacOS',
                    PageTime: '123',
                }
            };
            expect(ret).to.eql(expected);
        });

        it('should return success on multiple calls of TxnAsset', async () => {
            let txnAsset = new TxnAsset();
            await txnAsset.CreateAsset(transactionContext, asset.ID, asset.Name, asset.Seller, asset.Buyer, asset.Budget, asset.ClickPrice, asset.ImpressionPrice);

            await txnAsset.TxnAsset(transactionContext, asset.ID, 'CLICK', '127.0.0.5', 'safari', 'MacOS', '976');
            await txnAsset.TxnAsset(transactionContext, asset.ID, 'CLICK', '127.0.0.2', 'firefox', 'Windows', '145');
            await txnAsset.TxnAsset(transactionContext, asset.ID, 'IMPRESSION', '127.0.0.3', 'chrome', 'Windows', '325');
            await txnAsset.TxnAsset(transactionContext, asset.ID, 'IMPRESSION', '127.0.0.4', 'safari', 'MacOS', '624');
            await txnAsset.TxnAsset(transactionContext, asset.ID, 'CLICK', '127.0.0.1', 'chrome', 'MacOS', '123');
            let ret = JSON.parse((await chaincodeStub.getState(asset.ID)).toString());
            let expected = {
                ID: 'asset1',
                Name: 'MyCampaign',
                Seller: 'Ad Space Seller',
                Buyer: 'Ad Space Buyer',
                TotalBudget: 1000,
                Budget: 999.9698000000001, //1000 - 3(0.01) - 2(0.0001)
                ClickPrice: 0.01,
                ClickCount: 3,
                ImpressionPrice: 0.0001,
                ImpressionCount: 2,
                PurchaseCount: 0,
                Status: 'ACTIVE',
                LastTxn: {
                    Ip: '127.0.0.1',
                    Browser: 'chrome',
                    Device: 'MacOS',
                    PageTime: '123',
                }
            };
            expect(ret).to.eql(expected);
        });

        it('should return success on final call of TxnAsset', async () => {
            let txnAsset = new TxnAsset();
            await txnAsset.CreateAsset(transactionContext, asset.ID, asset.Name, asset.Seller, asset.Buyer, 0.05, asset.ClickPrice, asset.ImpressionPrice);

            await txnAsset.TxnAsset(transactionContext, asset.ID, 'CLICK', '127.0.0.5', 'safari', 'MacOS', '976');
            await txnAsset.TxnAsset(transactionContext, asset.ID, 'CLICK', '127.0.0.2', 'firefox', 'Windows', '145');
            await txnAsset.TxnAsset(transactionContext, asset.ID, 'CLICK', '127.0.0.3', 'chrome', 'Windows', '325');
            await txnAsset.TxnAsset(transactionContext, asset.ID, 'CLICK', '127.0.0.4', 'safari', 'MacOS', '624');
            await txnAsset.TxnAsset(transactionContext, asset.ID, 'CLICK', '127.0.0.1', 'chrome', 'MacOS', '123');
            let ret = JSON.parse((await chaincodeStub.getState(asset.ID)).toString());
            let expected = {
                ID: 'asset1',
                Name: 'MyCampaign',
                Seller: 'Ad Space Seller',
                Buyer: 'Ad Space Buyer',
                TotalBudget: 0.05,
                Budget: 0,
                ClickPrice: 0.01,
                ClickCount: 5,
                ImpressionPrice: 0.0001,
                ImpressionCount: 0,
                PurchaseCount: 0,
                Status: 'FINISHED',
                LastTxn: {
                    Ip: '127.0.0.1',
                    Browser: 'chrome',
                    Device: 'MacOS',
                    PageTime: '123',
                }
            };
            expect(ret).to.eql(expected);
        });
    });

    describe('Test GetAllAssets', () => {
        it('should return success on GetAllAssets', async () => {
            let txnAsset = new TxnAsset();

            await txnAsset.CreateAsset(transactionContext,'asset1','Campaign1','Seller1','Buyer1',100,0.01,0.001);
            await txnAsset.CreateAsset(transactionContext, 'asset2', 'Campaign2','Seller2','Buyer2',1000,0.01,0.001);
            await txnAsset.CreateAsset(transactionContext, 'asset3', 'Campaign3','Seller3','Buyer3',1500,0.01,0.001);
            await txnAsset.CreateAsset(transactionContext, 'asset4', 'Campaign4','Seller4','Buyer4',500,0.01,0.001);
            let ret = await txnAsset.GetAllAssets(transactionContext);
            ret = JSON.parse(ret);
            expect(ret.length).to.equal(4);
            let expected = [
                {Record: {ID: 'asset1', Name: 'Campaign1', Seller: 'Seller1', Buyer: 'Buyer1', TotalBudget: 100, Budget: 100, ClickPrice: 0.01, ClickCount: 0, ImpressionPrice: 0.001, ImpressionCount: 0, PurchaseCount: 0, Status: 'ISSUED'}},
                {Record: {ID: 'asset2', Name: 'Campaign2', Seller: 'Seller2', Buyer: 'Buyer2', TotalBudget: 1000, Budget: 1000, ClickPrice: 0.01, ClickCount: 0, ImpressionPrice: 0.001, ImpressionCount: 0, PurchaseCount: 0, Status: 'ISSUED'}},
                {Record: {ID: 'asset3', Name: 'Campaign3', Seller: 'Seller3', Buyer: 'Buyer3', TotalBudget: 1500, Budget: 1500, ClickPrice: 0.01, ClickCount: 0, ImpressionPrice: 0.001, ImpressionCount: 0, PurchaseCount: 0, Status: 'ISSUED'}},
                {Record: {ID: 'asset4', Name: 'Campaign4', Seller: 'Seller4', Buyer: 'Buyer4', TotalBudget: 500, Budget: 500, ClickPrice: 0.01, ClickCount: 0, ImpressionPrice: 0.001, ImpressionCount: 0, PurchaseCount: 0, Status: 'ISSUED'}}
            ];
            for(let e in expected){
                expect(ret.ID).to.eql(e.ID);
            }
        });
        // it('should return success on GetAllAssets for non JSON value', async () => {
        //     let txnAsset = new TxnAsset();
        //     chaincodeStub.putState.onFirstCall().callsFake((key, value) => {
        //         if (!chaincodeStub.states) {
        //             chaincodeStub.states = {};
        //         }
        //         chaincodeStub.states[key] = 'non-json-value';
        //     });
        //     await txnAsset.CreateAsset(transactionContext,'asset1','Campaign1','Seller1','Buyer1',100,0.01,0.001);
        //     await txnAsset.CreateAsset(transactionContext, 'asset2', 'Campaign2','Seller2','Buyer2',1000,0.01,0.001);
        //     await txnAsset.CreateAsset(transactionContext, 'asset3', 'Campaign3','Seller3','Buyer3',1500,0.01,0.001);
        //     await txnAsset.CreateAsset(transactionContext, 'asset4', 'Campaign4','Seller4','Buyer4',500,0.01,0.001);
        //     let ret = await txnAsset.GetAllAssets(transactionContext);
        //     ret = JSON.stringify(ret);
        //     expect(ret.length).to.equal(4);
        //     let expected = [
        //         {Record: 'non-json-value'},
        //         {Record: {ID: 'asset2', Name: 'Campaign2', Seller: 'Seller2', Buyer: 'Buyer2', Budget: 1000, ClickPrice: 0.01, ImpressionPrice: 0.001}},
        //         {Record: {ID: 'asset3', Name: 'Campaign3', Seller: 'Seller3', Buyer: 'Buyer3', Budget: 1500, ClickPrice: 0.01, ImpressionPrice: 0.001}},
        //         {Record: {ID: 'asset4', Name: 'Campaign4', Seller: 'Seller4', Buyer: 'Buyer4', Budget: 500, ClickPrice: 0.01, ImpressionPrice: 0.001}}
        //     ];
        //     for(let e in expected){
        //         expect(ret.ID).to.eql(e.Record);
        //     }
        // });
    });

    describe('Test retrieveHistory', () => {
        it('should return success on retrieveHistory', async () => {
            let txnAsset = new TxnAsset();

            await txnAsset.CreateAsset(transactionContext, asset.ID, asset.Name, asset.Seller, asset.Buyer, 0.05, asset.ClickPrice, asset.ImpressionPrice);
            await txnAsset.TxnAsset(transactionContext, asset.ID, 'CLICK', '127.0.0.5', 'safari', 'MacOS', '976');
            let ret = await txnAsset.retrieveHistory(transactionContext,'asset1');
            ret = JSON.parse(ret);
            expect(ret).to.not.equal(undefined);
        });
    });
});
