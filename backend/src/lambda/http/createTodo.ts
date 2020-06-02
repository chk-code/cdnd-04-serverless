import 'source-map-support/register'

import { APIGatewayProxyEvent, APIGatewayProxyHandler, APIGatewayProxyResult } from 'aws-lambda'
import * as AWS  from 'aws-sdk'
import { CreateTodoRequest } from '../../requests/CreateTodoRequest'
import { getUserId } from "../utils"
import { createLogger } from '../../utils/logger'
import * as uuid from 'uuid'

const logger = createLogger('create-todo')

const docClient = new AWS.DynamoDB.DocumentClient()
const todosTable = process.env.TODOS_TABLE

export const handler: APIGatewayProxyHandler = async (event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> => {
  logger.info('Processing new Todo: ', event)
  const createTodo: CreateTodoRequest = JSON.parse(event.body)
  logger.info('Request for new Todo: ', createTodo)

  const userId = getUserId(event)
  const todoId = uuid.v4()
  const timestamp = new Date().toISOString()

  // DONE: Implement creating a new TODO item
  logger.info('Creating new Todo for user: ', userId)
  const newTodo = {
    todoId: todoId,
    userId: userId,
    createdAt: timestamp,
    done: false,
    attachmentUrl: "https://",
    name: createTodo.name,
    dueDate: createTodo.dueDate
  }
  // Writing newTodo to DynamoDB
  logger.info('Writing new Todo to Table: ')
  await docClient.put({
    TableName: todosTable,
    Item: newTodo
  }).promise()

  logger.info('Returning new Todo: ', newTodo)
  // Returning newTodo and status code 201
  return {
    statusCode: 201,
    headers: {
      'Access-Control-Allow-Origin': '*'
    },
    body: JSON.stringify({item: newTodo})
  }
}
