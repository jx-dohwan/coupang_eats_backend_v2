import {
  WebSocketGateway,
  WebSocketServer,
  SubscribeMessage,
  OnGatewayConnection,
  OnGatewayDisconnect,
  MessageBody,
  ConnectedSocket,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';

@WebSocketGateway({ cors: { origin: '*' } }) // 모든 도메인에서 접속 허용
export class EventsGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer()
  server: Server;

  // 클라이언트 연결 시 실행
  handleConnection(client: Socket) {
    console.log(`Client connected: ${client.id}`);
    // 여기서 JWT 토큰 검증 로직을 추가하여 user 정보를 socket.data에 저장할 수 있습니다.
  }

  // 클라이언트 연결 해제 시 실행
  handleDisconnect(client: Socket) {
    console.log(`Client disconnected: ${client.id}`);
  }

  // [1] 로그인 직후 사용자별 방(Room) 입장
  // 예: "Owner:1", "Delivery:5" 방에 들어가면, 서버가 특정 유저에게만 알림을 보낼 수 있음
  @SubscribeMessage('joinUserRoom')
  handleJoinUserRoom(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { userId: number; role: string },
  ) {
    const roomName = `${data.role}:${data.userId}`;
    client.join(roomName);
    console.log(`Client ${client.id} joined ${roomName}`);
  }

  // [2] 주문 상세 페이지 입장 시 해당 주문 방(Room) 입장
  // 고객, 점주, 배달원이 모두 이 방에 있으면 주문 상태 변경 알림을 동시에 받을 수 있음
  @SubscribeMessage('joinOrderRoom')
  handleJoinOrderRoom(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { orderId: number },
  ) {
    const roomName = `order:${data.orderId}`;
    client.join(roomName);
    console.log(`Client ${client.id} joined order room: ${roomName}`);
  }

  // [3] 배달원 위치 실시간 업데이트 (DB 저장 X, 중계만 함)
  @SubscribeMessage('updateDriverLocation')
  handleDriverLocation(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { orderId: number; lat: number; lng: number },
  ) {
    // 해당 주문 방에 있는 사람(고객)에게 위치 정보 전송
    const roomName = `order:${data.orderId}`;
    // 'driverLocation' 이라는 이벤트 이름으로 위치 데이터 전송
    client.to(roomName).emit('driverLocation', {
      lat: data.lat,
      lng: data.lng,
    });
  }
}
