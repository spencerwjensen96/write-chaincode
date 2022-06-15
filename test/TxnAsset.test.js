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
        asset = {
            ID: 'asset1',
            Name: 'Asset 1',
            Owner: 'First Owner',
            Amount: 1000
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
                await txnAsset.CreateAsset(transactionContext, asset.ID, asset.Name, asset.Owner, asset.Amount);
                assert.fail('CreateAsset should have failed');
            } catch(err) {
                expect(err.name).to.equal('failed inserting key');
            }
        });

        it('should return success on CreateAsset', async () => {
            let txnAsset = new TxnAsset();

            await txnAsset.CreateAsset(transactionContext, asset.ID, asset.Name, asset.Owner, asset.Amount);

            let ret = JSON.parse((await chaincodeStub.getState(asset.ID)).toString());
            expect(ret.ID).to.eql(asset.ID);
        });
    });

    describe('Test ReadAsset', () => {
        it('should return error on ReadAsset', async () => {
            let txnAsset = new TxnAsset();
            await txnAsset.CreateAsset(transactionContext, asset.ID, asset.Name, asset.Owner, asset.Amount);

            try {
                await txnAsset.ReadAsset(transactionContext, 'asset2');
                assert.fail('ReadAsset should have failed');
            } catch (err) {
                expect(err.message).to.equal('The asset asset2 does not exist');
            }
        });

        it('should return success on ReadAsset', async () => {
            let txnAsset = new TxnAsset();
            await txnAsset.CreateAsset(transactionContext, asset.ID, asset.Name, asset.Owner, asset.Amount);

            let ret = JSON.parse(await chaincodeStub.getState(asset.ID));
            expect(ret.ID).to.eql(asset.ID);
        });
    });

    describe('Test UpdateAsset', () => {
        it('should return error on UpdateAsset', async () => {
            let txnAsset = new TxnAsset();
            await txnAsset.CreateAsset(transactionContext, asset.ID, asset.Name, asset.Owner, asset.Amount);

            try {
                await txnAsset.UpdateAsset(transactionContext, 'asset2', 'Asset 2', 'Owner 2', 100);
                assert.fail('UpdateAsset should have failed');
            } catch (err) {
                expect(err.message).to.equal('The asset asset2 does not exist');
            }
        });

        it('should return success on UpdateAsset', async () => {
            let txnAsset = new TxnAsset();
            await txnAsset.CreateAsset(transactionContext, asset.ID, asset.Name, asset.Owner, asset.Amount);

            await txnAsset.UpdateAsset(transactionContext, 'asset1', 'Another Name', 'Owner 2', 100);
            let ret = JSON.parse(await chaincodeStub.getState(asset.ID));
            let expected = {
                ID: 'asset1',
                Name: 'Another Name',
                Owner: 'Owner 2',
                Amount: 100
            };
            expect(ret.ID).to.eql(expected.ID);
        });
    });

    describe('Test DeleteAsset', () => {
        it('should return error on DeleteAsset', async () => {
            let txnAsset = new TxnAsset();
            await txnAsset.CreateAsset(transactionContext, asset.ID, asset.Name, asset.Owner, asset.Amount);

            try {
                await txnAsset.DeleteAsset(transactionContext, 'asset2');
                assert.fail('DeleteAsset should have failed');
            } catch (err) {
                expect(err.message).to.equal('The asset asset2 does not exist');
            }
        });

        it('should return success on DeleteAsset', async () => {
            let txnAsset = new TxnAsset();
            await txnAsset.CreateAsset(transactionContext, asset.ID, asset.Name, asset.Owner, asset.Amount);

            await txnAsset.DeleteAsset(transactionContext, asset.ID);
            let ret = await chaincodeStub.getState(asset.ID);
            expect(ret).to.equal(undefined);
        });
    });

    describe('Test TxnAsset', () => {
        it('should return error on TxnAsset', async () => {
            let txnAsset = new TxnAsset();
            await txnAsset.CreateAsset(transactionContext, asset.ID, asset.Name, asset.Owner, asset.Amount);

            try {
                await txnAsset.TxnAsset(transactionContext, 'asset2', 'New Owner');
                assert.fail('TxnAsset should have failed');
            } catch (err) {
                expect(err.message).to.equal('The asset asset2 does not exist');
            }
        });

        it('should return success on TxnAsset with the new owner', async () => {
            let txnAsset = new TxnAsset();
            await txnAsset.CreateAsset(transactionContext, asset.ID, asset.Name, asset.Owner, asset.Amount);

            await txnAsset.TxnAsset(transactionContext, asset.ID, 'NewOwner');
            let ret = JSON.parse((await chaincodeStub.getState(asset.ID)).toString());
            let expected = {
                ID: 'asset1',
                Name: 'Asset 1',
                Owner: 'NewOwner',
                Amount: 1000
            };
            expect(ret).to.eql(expected);
        });

        it('should return success on multiple calls of TxnAsset', async () => {
            let txnAsset = new TxnAsset();
            await txnAsset.CreateAsset(transactionContext, asset.ID, asset.Name, asset.Owner, asset.Amount);

            await txnAsset.TxnAsset(transactionContext, asset.ID, 'NewOwner 1');
            await txnAsset.TxnAsset(transactionContext, asset.ID, 'NewOwner 2');

            let ret = JSON.parse((await chaincodeStub.getState(asset.ID)).toString());
            let expected = {
                ID: 'asset1',
                Name: 'Asset 1',
                Owner: 'NewOwner 2',
                Amount: 1000
            };
            expect(ret).to.eql(expected);
        });
    });

    describe('Test GetAllAssets', () => {
        it('should return success on GetAllAssets', async () => {
            let txnAsset = new TxnAsset();

            await txnAsset.CreateAsset(transactionContext, 'asset1', 'Asset 1', 'Owner 1', 1000);
            await txnAsset.CreateAsset(transactionContext, 'asset2', 'Asset 2', 'Owner 2', 100);
            await txnAsset.CreateAsset(transactionContext, 'asset3', 'Asset 3', 'Owner 3', 500);
            await txnAsset.CreateAsset(transactionContext, 'asset4', 'Asset 4', 'Owner 4', 750);
            let ret = await txnAsset.GetAllAssets(transactionContext);
            ret = JSON.parse(ret);
            expect(ret.length).to.equal(4);
            let expected = [
                {Record: {ID: 'asset1', Name: 'Asset 1', Owner: 'Owner 1', Amount: 1000}},
                {Record: {ID: 'asset2', Name: 'Asset 2', Owner: 'Owner 2', Amount: 100}},
                {Record: {ID: 'asset3', Name: 'Asset 3', Owner: 'Owner 3', Amount: 500}},
                {Record: {ID: 'asset4', Name: 'Asset 4', Owner: 'Owner 4', Amount: 750}}
            ];
            for(let e in expected){
                expect(ret.ID).to.eql(e.ID);
            }
        });
    });

    describe('Test retrieveHistory', () => {
        it('should return success on retrieveHistory', async () => {
            let txnAsset = new TxnAsset();

            await txnAsset.CreateAsset(transactionContext, asset.ID, asset.Name, asset.Owner, asset.Amount);
            await txnAsset.TxnAsset(transactionContext, asset.ID, 'NewOwner');

            let ret = await txnAsset.retrieveHistory(transactionContext,'asset1');
            ret = JSON.parse(ret);
            expect(ret).to.not.equal(undefined);
        });
    });
});
