import 'source-map-support/register'
import { APIGatewayProxyEvent, APIGatewayProxyHandler, APIGatewayProxyResult } from 'aws-lambda'
import { CreateTodoRequest } from '../../requests/CreateTodoRequest'
import { getUserId } from "../utils"
import { createLogger } from '../../utils/logger'
import { createTodo } from '../../businessLogic/todo_items'

const logger = createLogger('create-todo')

export const handler: APIGatewayProxyHandler = async (event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> => {
  logger.info('Processing new Todo: ', event)
  const creaTodo: CreateTodoRequest = JSON.parse(event.body)
  if(!creaTodo.name){
    logger.info("WARNING: Todo Name is empty!")
  }
  const userId = getUserId(event)
  logger.info(`Request from ${userId} for new Todo: `, createTodo)

  // Writing newTodo to DynamoDB
  logger.info('Writing new Todo to Table: ')
  const newTodo = await createTodo(creaTodo, userId)
  // Returning newTodo and status code 201
  return {
    statusCode: 201,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Credentials': true
    },
    // Use item: newTodo format for the frontend
    body: JSON.stringify({item: newTodo})
  }
}
