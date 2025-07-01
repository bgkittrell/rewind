import { APIGatewayProxyEvent, APIGatewayProxyResult, Context } from 'aws-lambda';

export const handler = async (
  event: APIGatewayProxyEvent,
  context: Context
): Promise<APIGatewayProxyResult> => {
  console.log('Event:', JSON.stringify(event, null, 2));
  console.log('Context:', JSON.stringify(context, null, 2));

  const { httpMethod, pathParameters } = event;

  try {
    switch (httpMethod) {
      case 'GET':
        return await getPodcasts(event);
      case 'POST':
        return await addPodcast(event);
      case 'DELETE':
        return await deletePodcast(event);
      default:
        return {
          statusCode: 405,
          headers: {
            'Content-Type': 'application/json',
            'Access-Control-Allow-Origin': '*',
          },
          body: JSON.stringify({
            error: {
              message: 'Method not allowed',
              code: 'METHOD_NOT_ALLOWED'
            }
          }),
        };
    }
  } catch (error) {
    console.error('Error:', error);
    return {
      statusCode: 500,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
      },
      body: JSON.stringify({
        error: {
          message: 'Internal server error',
          code: 'INTERNAL_ERROR'
        }
      }),
    };
  }
};

async function getPodcasts(event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> {
  // TODO: Implement get podcasts logic
  return {
    statusCode: 200,
    headers: {
      'Content-Type': 'application/json',
      'Access-Control-Allow-Origin': '*',
    },
    body: JSON.stringify({
      podcasts: [],
      total: 0,
      hasMore: false
    }),
  };
}

async function addPodcast(event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> {
  // TODO: Implement add podcast logic
  return {
    statusCode: 201,
    headers: {
      'Content-Type': 'application/json',
      'Access-Control-Allow-Origin': '*',
    },
    body: JSON.stringify({
      message: 'Podcast added successfully',
      podcastId: 'temp-id'
    }),
  };
}

async function deletePodcast(event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> {
  // TODO: Implement delete podcast logic
  return {
    statusCode: 200,
    headers: {
      'Content-Type': 'application/json',
      'Access-Control-Allow-Origin': '*',
    },
    body: JSON.stringify({
      message: 'Podcast removed successfully'
    }),
  };
}