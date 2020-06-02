import 'source-map-support/register'

import { APIGatewayProxyEvent, APIGatewayProxyResult, APIGatewayProxyHandler } from 'aws-lambda'
import { createLogger } from '../../utils/logger'
import { getUserId } from '../utils'
import { generateUploadUrl } from '../../businessLogic/todo_items'

const logger = createLogger('generate-upload-url')

export const handler: APIGatewayProxyHandler = async (event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> => {
  logger.info('Processing new Image: ', event)
  const todoId = event.pathParameters.todoId
  const userId = getUserId(event)
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
  const response = await generateUploadUrl(todoId,userId,event)

  logger.info("Update complete. Presigned URL generated successfully ")
  // DONE: Return a presigned URL to upload a file for a TODO item with the provided id
  return {
    statusCode: 201,
    headers: {
      'Access-Control-Allow-Origin': '*'
    },
    body: JSON.stringify({
      "uploadUrl": response.uploadUrl
    })
  }
}