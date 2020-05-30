import 'source-map-support/register'

import { APIGatewayProxyEvent, APIGatewayProxyResult, APIGatewayProxyHandler } from 'aws-lambda'
import { createLogger } from '../../utils/logger'
import * as AWS  from 'aws-sdk'
import * as uuid from 'uuid'

const docClient = new AWS.DynamoDB.DocumentClient()
const s3 = new AWS.S3({
  signatureVersion: 'v4'
})
const todosTable = process.env.TODOS_TABLE
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
        'Access-Control-Allow-Origin': '*'
      },
      body: JSON.stringify({
        error: 'Todo not provided.'
      })
    }
  }
  const validTodoId = await todoExists(todoId)

  if (!validTodoId) {
    logger.error('Todo does not exist', todoId)
    return {
      statusCode: 404,
      headers: {
        'Access-Control-Allow-Origin': '*'
      },
      body: JSON.stringify({
        error: 'Todo does not exist'
      })
    }
  }
  const imageId = uuid.v4()
  const imageURL = await createImage(todoId, imageId, event)

  const signedURL = getUploadUrl(imageId)
  logger.info("Updating Todos Item")
  const updateItem = {
    TableName: this.todosTable,
    Key: {
        todoId: todoId
    },
    UpdateExpression: "set attachmentUrl = :r",
    ExpressionAttributeValues: {
        ":r": imageURL
    },
    ReturnValues: "UPDATED_NEW"
  }
  await this.docClient.update(updateItem).promise()
  logger.info("Update complete. Presigned URL generated successfully ", signedURL)
  // DONE: Return a presigned URL to upload a file for a TODO item with the provided id
  return {
    statusCode: 201,
    headers: {
      'Access-Control-Allow-Origin': '*'
    },
    body: JSON.stringify({
      signedURL: signedURL,
      imageUrl: imageURL
    })
  }
}

async function todoExists(todoId: string) {
  const result = await docClient
    .get({
      TableName: todosTable,
      Key: {
        todoId: todoId
      }
    })
    .promise()

  logger.info('Get Todo: ', result)
  return !!result.Item
}
async function createImage(todoId: string, imageId: string, event: any) {
  const timestamp = new Date().toISOString()

  const newItem = {
    todoId,
    timestamp,
    imageId,
    imageUrl: `https://${bucketName}.s3.amazonaws.com/${imageId}`
  }
  logger.info('Storing new item: ', newItem)
  await docClient
    .put({
      TableName: imagesTable,
      Item: newItem
    })
    .promise()

  return newItem.imageUrl
}
function getUploadUrl(imageId: string) {
  return s3.getSignedUrl('putObject', {
    Bucket: bucketName,
    Key: imageId,
    Expires: urlExpiration
  })
}