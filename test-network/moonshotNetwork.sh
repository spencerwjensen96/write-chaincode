echo -e "\e[1;33mSHUTTING DOWN NETWORK\n\e[1;31m./network.sh down\e[1;m"
./network.sh down

echo -e "\e[1;33mSTARTING NETWORK and CREATING CHANNEL 'moonshot'\n\e[1;31m./network.sh up createChannel -c moonshot -ca -s couchdb\e[1;m"
./network.sh up createChannel -c moonshot -ca -s couchdb

echo -e "\e[1;33mDEPLOYING CC from \e[1;32m../moonshot-digital-advertising/chaincode/\n\e[1;31m./network.sh up createChannel -c moonshot -ca -s couchdb\e[1;m"
./network.sh deployCC -c moonshot -ccn moonshot -ccl javascript -ccp ../moonshot-digital-advertising/chaincode/ -ccv 1

echo -e "\e[1;33mCONFIGURATION SETUP\e[1;m"
echo PATH=${PWD}/../bin:$PATH
export PATH=${PWD}/../bin:$PATH && sleep 1

echo FABRIC_CFG_PATH=${PWD}/../config/
export FABRIC_CFG_PATH=${PWD}/../config/ && sleep 1

echo CORE_PEER_TLS_ENABLED=true
export CORE_PEER_TLS_ENABLED=true && sleep 1

echo CORE_PEER_LOCALMSPID="Org1MSP"
export CORE_PEER_LOCALMSPID="Org1MSP" && sleep 1

echo CORE_PEER_TLS_ROOTCERT_FILE=${PWD}/organizations/peerOrganizations/org1.example.com/peers/peer0.org1.example.com/tls/ca.crt
export CORE_PEER_TLS_ROOTCERT_FILE=${PWD}/organizations/peerOrganizations/org1.example.com/peers/peer0.org1.example.com/tls/ca.crt && sleep 1

echo CORE_PEER_MSPCONFIGPATH=${PWD}/organizations/peerOrganizations/org1.example.com/users/Admin@org1.example.com/msp
export CORE_PEER_MSPCONFIGPATH=${PWD}/organizations/peerOrganizations/org1.example.com/users/Admin@org1.example.com/msp && sleep 1

echo CORE_PEER_ADDRESS=localhost:7051
export CORE_PEER_ADDRESS=localhost:7051 && sleep 1

echo -e "\e[1;33mINVOKE CHAINCODE INIT_LEDGER\n\e[1;31mpeer chaincode invoke -o localhost:7050 --ordererTLSHostnameOverride orderer.example.com --tls --cafile "${PWD}/organizations/ordererOrganizations/example.com/orderers/orderer.example.com/msp/tlscacerts/tlsca.example.com-cert.pem" -C moonshot -n moonshot --peerAddresses localhost:7051 --tlsRootCertFiles "${PWD}/organizations/peerOrganizations/org1.example.com/peers/peer0.org1.example.com/tls/ca.crt" --peerAddresses localhost:9051 --tlsRootCertFiles "${PWD}/organizations/peerOrganizations/org2.example.com/peers/peer0.org2.example.com/tls/ca.crt" -c '{"function":"InitLedger","Args":[]}'
\e[1;m"
peer chaincode invoke -o localhost:7050 --ordererTLSHostnameOverride orderer.example.com --tls --cafile "${PWD}/organizations/ordererOrganizations/example.com/orderers/orderer.example.com/msp/tlscacerts/tlsca.example.com-cert.pem" -C moonshot -n moonshot --peerAddresses localhost:7051 --tlsRootCertFiles "${PWD}/organizations/peerOrganizations/org1.example.com/peers/peer0.org1.example.com/tls/ca.crt" --peerAddresses localhost:9051 --tlsRootCertFiles "${PWD}/organizations/peerOrganizations/org2.example.com/peers/peer0.org2.example.com/tls/ca.crt" -c '{"function":"InitLedger","Args":[]}' && sleep 2

echo -e "\e[1;33mQUERY CHAINCODE GET_ALL_ASSETS\n\e[1;31mpeer chaincode query -C moonshot -n moonshot -c '{"Args":["GetAllAssets"]}'\e[1;m"
peer chaincode query -C moonshot -n moonshot -c '{"Args":["GetAllAssets"]}'

export PATH=${PWD}/../bin:$PATH
export FABRIC_CFG_PATH=${PWD}/../config/
export CORE_PEER_TLS_ENABLED=true
export CORE_PEER_LOCALMSPID="Org1MSP"
export CORE_PEER_TLS_ROOTCERT_FILE=${PWD}/organizations/peerOrganizations/org1.example.com/peers/peer0.org1.example.com/tls/ca.crt
export CORE_PEER_MSPCONFIGPATH=${PWD}/organizations/peerOrganizations/org1.example.com/users/Admin@org1.example.com/msp
export CORE_PEER_ADDRESS=localhost:7051 