import { json, ipfs } from "@graphprotocol/graph-ts"
import {
  Approval as ApprovalEvent,
  ApprovalForAll as ApprovalForAllEvent,
  OwnershipTransferred as OwnershipTransferredEvent,
  Transfer as TransferEvent,
  NftMeta
} from "../generated/NftMeta/NftMeta"
import {
  Approval,
  ApprovalForAll,
  OwnershipTransferred,
  Transfer,
  QLTransfer,
  MetaData    
} from "../generated/schema"

// import ipfsClient from 'ipfs-http-client'
// var ipfs = ipfsClient({ host: 'localhost', port: '8020', protocol: 'http' })

export function handleApproval(event: ApprovalEvent): void {
  let entity = new Approval(
    event.transaction.hash.concatI32(event.logIndex.toI32())
  )
  entity.owner = event.params.owner
  entity.approved = event.params.approved
  entity.tokenId = event.params.tokenId

  entity.blockNumber = event.block.number
  entity.blockTimestamp = event.block.timestamp
  entity.transactionHash = event.transaction.hash

  entity.save()
}

export function handleApprovalForAll(event: ApprovalForAllEvent): void {
  let entity = new ApprovalForAll(
    event.transaction.hash.concatI32(event.logIndex.toI32())
  )
  entity.owner = event.params.owner
  entity.operator = event.params.operator
  entity.approved = event.params.approved

  entity.blockNumber = event.block.number
  entity.blockTimestamp = event.block.timestamp
  entity.transactionHash = event.transaction.hash

  entity.save()
}

export function handleOwnershipTransferred(
  event: OwnershipTransferredEvent
): void {
  let entity = new OwnershipTransferred(
    event.transaction.hash.concatI32(event.logIndex.toI32())
  )
  entity.previousOwner = event.params.previousOwner
  entity.newOwner = event.params.newOwner

  entity.blockNumber = event.block.number
  entity.blockTimestamp = event.block.timestamp
  entity.transactionHash = event.transaction.hash

  entity.save()
}


// 重写handleTransfer逻辑
export function handleTransfer(event: TransferEvent): void {
  const qlTransfer = new QLTransfer(event.transaction.hash.toHexString());
  qlTransfer.from = event.params.from;
  qlTransfer.to = event.params.to;
  qlTransfer.tokenId = event.params.tokenId;

  const contract = NftMeta.bind(event.address)
  qlTransfer.tokenURI = contract.tokenURI(event.params.tokenId)
  qlTransfer.save()

  // 将http 转换为ipfs数据
  const splistr = qlTransfer.tokenURI.split("/ipfs/")
  if(splistr.length < 2) {
    return
  }

  const ipfsPath = splistr[1]
  // 获取MetaData数据
  const data = ipfs.cat(ipfsPath)
  if(!data) {
    return
  }

  // 转换为json格式
  const value = json.fromBytes(data)
  const meta = new MetaData(qlTransfer.tokenId.toString())
  const obj = value.toObject()
  if(obj != null) {
    const name = obj.get("name")
    if(name != null) {
      meta.name = name.toString()
    }

    const image = obj.get("image")
    if(image != null) {
      meta.image = image.toString()
    }
  }
  meta.owner = qlTransfer.to
  // 数据存储
  meta.save()
}
