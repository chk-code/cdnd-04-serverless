import 'source-map-support/register'

import { APIGatewayProxyEvent, APIGatewayProxyResult, APIGatewayProxyHandler } from 'aws-lambda'
import { createLogger } from '../../utils/logger'
import * as AWS  from 'aws-sdk'
import * as uuid from 'uuid'
import { getUserId } from '../utils'
import { TodoItem } from '../../models/TodoItem'
import * as AWSXray from 'aws-xray-sdk'
const XAWS = AWSXray.captureAWS(AWS)

const docClient = new XAWS.DynamoDB.DocumentClient()
const s3 = new AWS.S3({
  signatureVersion: 'v4'
})
const todosTable = process.env.TODOS_TABLE
const todosTodoIdIdx = process.env.TODOS_ID_INDEX
const imagesTable = process.env.IMAGES_TABLE
const bucketName = process.env.IMAGES_S3_BUCKET
const urlExpiration = process.env.SIGNED_URL_EXPIRATION

const logger = createLogger('generate-upload-url')

export const handler: APIGatewayProxyHandler = async (event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> => {
  logger.info('Processing new Image: ', event)
  const todoId = event.pathParameters.todoId
  if (!todoId) {
    logger.error('Todo not provided')
    return {
      statusCode: 404,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Credentials': true
      },
      body: JSON.stringify({
        error: 'Todo not provided.'
      })
    }
  }
  
  const imageId = uuid.v4()
  const signedURL = getUploadUrl(imageId)
  const imageURL = await createImage(todoId, imageId, event)
  logger.info("Image created, Signed URL: "+signedURL+" - Image URL: "+imageURL+" -!")
  logger.info("Updating Todos Item")

  const updItem = await updateTodoWithURL(todoId,imageURL,event)
  logger.info("Update complete. Presigned URL generated successfully ", updItem)
  // DONE: Return a presigned URL to upload a file for a TODO item with the provided id
  return {
    statusCode: 201,
    headers: {
      'Access-Control-Allow-Origin': '*'
    },
    body: JSON.stringify({
      "uploadUrl": signedURL
    })
  }
}

async function createImage(todoId: string, imageId: string, event: any) {
  const timestamp = new Date().toISOString()
  const newImage = JSON.parse(event.body)

  const newImgItem = {
    todoId,
    timestamp,
    imageId,
    ...newImage,
    imageUrl: `https://${bucketName}.s3.amazonaws.com/${imageId}`
  }
  logger.info('Storing new Image item in Image DB: ', newImgItem)
  await docClient
    .put({
      TableName: imagesTable,
      Item: newImgItem
    })
    .promise()

  return newImgItem.imageUrl
}
function getUploadUrl(imageId: string) {
  return s3.getSignedUrl('putObject', {
    Bucket: bucketName,
    Key: imageId,
    Expires: urlExpiration
  })
}
async function updateTodoWithURL(todoId: string, signedURL: String, event: APIGatewayProxyEvent): Promise<TodoItem> {
  const userId = getUserId(event)
  const currentItem = await getTodoItemById(todoId)
  logger.info("Update of Todo Item - "+todoId+" - for User - "+userId+" -!")
  const itemUpdate = {
    TableName: todosTable,
    Key:{
        todoId: todoId,
        createdAt: currentItem.createdAt
    },
    UpdateExpression: "set #aU=:attURL",
    ExpressionAttributeNames: {'#aU' : 'attachmentUrl'},
    ExpressionAttributeValues:{
      ":attURL": signedURL
    },
    ReturnValues:"UPDATED_NEW"
  }
    const updResult  = await docClient
  .update(itemUpdate, function(err, data) {
    if (err) {
        logger.error("Unable to update item. Error JSON:", JSON.stringify(err, null, 2));
    } else {
        logger.info("Update succeeded:", JSON.stringify(data, null, 2));
    }
  }).promise()

  return updResult.$response.data as TodoItem
  }
async function getTodoItemById(todoId: any): Promise<TodoItem> {
    logger.info("Starting to fetch item with TodoID: "+todoId);
    const result = await docClient.query({
      TableName: todosTable,
      IndexName: todosTodoIdIdx,
      KeyConditionExpression: '#k = :id ',
      ExpressionAttributeNames: {'#k' : 'todoId'},
      ExpressionAttributeValues:{':id' : todoId}
    }).promise()
    logger.info("Completed getTodoItemById");
    logger.info("Found " + result.Count + " element (it must be unique)");
    if (result.Count == 0)
      throw new Error('Element not found')
    if (result.Count > 1)
      throw new Error('todoId is not Unique')
    const item = result.Items[0]
    logger.info("This is the item: ",item);
    return item as TodoItem
  }